import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { createAuthHandler } from "./authApi.js";
import { createMinutesHandler } from "./minutesApi.js";
import { isHttps, securityHeaders } from "./security.js";

const root = process.cwd();
if (existsSync(resolve(root, ".env.local"))) process.loadEnvFile(resolve(root, ".env.local"));
process.env.NODE_ENV = "production";
if (!process.env.APP_ORIGIN || new URL(process.env.APP_ORIGIN).protocol !== "https:") {
  throw Error("Configure APP_ORIGIN avec l’adresse HTTPS publique de Sprintly.");
}
const origin = new URL(process.env.APP_ORIGIN);
if (origin.origin !== process.env.APP_ORIGIN) throw Error("APP_ORIGIN doit contenir uniquement l’origine HTTPS, sans chemin ni slash final.");
const directory = await realpath(resolve(root, "dist"));
const auth = createAuthHandler(root);
const minutes = createMinutesHandler(process.env.OPENAI_API_KEY || "", process.env.OPENAI_MODEL || "gpt-4.1-mini");
const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".webp": "image/webp",
};
const server = createServer(async (request, response) => {
  securityHeaders(response, true);
  const reject = (status: number) => { response.writeHead(status, { "Cache-Control": "no-store" }); response.end(); };
  try {
    // TRUST_PROXY=1 exige que ce port soit accessible uniquement au proxy TLS.
    if (!isHttps(request) || request.headers.host !== origin.host) return reject(400);
    await auth(request, response, () => {
      void minutes(request, response, () => { if (request.url?.startsWith("/api/")) reject(404); });
    });
    if (response.writableEnded || request.url?.startsWith("/api/")) return;
    if (request.method !== "GET" && request.method !== "HEAD") return reject(405);
    const pathname = decodeURIComponent(new URL(request.url || "/", origin).pathname);
    if (pathname.split("/").some(part => part.startsWith(".")) || pathname.includes("\\")) return reject(404);
    const candidate = resolve(directory, "." + pathname);
    if (candidate !== directory && !candidate.startsWith(directory + sep)) return reject(404);
    let file = candidate;
    if (!extname(pathname)) file = resolve(directory, "index.html");
    const actual = await realpath(file);
    if (!actual.startsWith(directory + sep) || !(await stat(actual)).isFile()) return reject(404);
    const type = contentTypes[extname(actual)];
    if (!type) return reject(404);
    response.writeHead(200, { "Content-Type": type, "Cache-Control": extname(actual) === ".html" ? "no-store" : "public, max-age=3600" });
    if (request.method === "HEAD") response.end();
    else createReadStream(actual).on("error", () => response.destroy()).pipe(response);
  } catch {
    if (!response.headersSent) reject(404);
    else response.destroy();
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 5000;
server.maxHeadersCount = 50;
server.listen(Number(process.env.PORT || 3000), process.env.HOST || "127.0.0.1", () => {
  console.log("Sprintly prêt derrière le proxy HTTPS.");
});
