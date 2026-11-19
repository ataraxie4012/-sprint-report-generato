import { createProjectsHandler } from "./projectsApi.js";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { directSprintEmails, documentEmails } from "../src/accessRoutes.js";

const scrypt = promisify(scryptCallback);
type PasswordRecord = { salt: string; hash: string };
type Session = { email: string; expires: number };
const allowedEmails = new Set([...directSprintEmails, ...documentEmails]);
const sessionDuration = 12 * 60 * 60 * 1000;
const cookieName = "sprintly_session";

export function authApi(root: string): Plugin {
  const handleProjects = createProjectsHandler(root);
  const accountsFile = join(root, ".data", "accounts.json");
  const sessions = new Map<string, Session>();
  const attempts = new Map<string, { count: number; expires: number }>();
  let writes: Promise<unknown> = Promise.resolve();

  const loadAccounts = async (): Promise<Record<string, PasswordRecord>> => {
    try {
      const records = JSON.parse(await readFile(accountsFile, "utf8"));
      if (!records || Array.isArray(records) || typeof records !== "object"
        || !Object.values(records).every((record) => {
          const value = record as PasswordRecord;
          return value && /^[a-f0-9]{32}$/.test(value.salt) && /^[a-f0-9]{128}$/.test(value.hash);
        })) throw new Error("Fichier de comptes invalide.");
      return records;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw error;
    }
  };

  const verify = async (password: string, record: PasswordRecord) => {
    const hash = await scrypt(password, record.salt, 64) as Buffer;
    return timingSafeEqual(hash, Buffer.from(record.hash, "hex"));
  };

  const tokenFor = (request: IncomingMessage) =>
    (request.headers.cookie || "").split(";")
      .map(part => part.trim()).find(part => part.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1);

  const cookie = (request: IncomingMessage, token: string, maxAge: number) =>
    `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`
    + (request.headers["x-forwarded-proto"] === "https" ? "; Secure" : "");

  const middleware = async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = request.url?.split("?")[0];
    const isProjects = path === "/api/projects" || path?.startsWith("/api/projects/");
    if (!path?.startsWith("/api/auth/") && !isProjects) return next();
    const send = (status: number, data: unknown) => {
      response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify(data));
    };

    try {
      const token = tokenFor(request);
      const session = token ? sessions.get(token) : undefined;
      if (session && session.expires <= Date.now()) {
        sessions.delete(token!);
      }
      const currentSession = session && session.expires > Date.now() ? session : undefined;
      if (isProjects) {
        if (!currentSession) return send(401, { error: "Reconnecte-toi pour accéder aux projets." });
        return await handleProjects(request, response, currentSession.email);
      }
      if (request.method === "GET" && path === "/api/auth/session") {
        if (!currentSession) return send(200, { user: null });
        const records = await loadAccounts();
        return send(200, { user: { email: currentSession.email, hasPassword: !!records[currentSession.email] } });
      }
      if (request.method !== "POST") return send(405, { error: "Méthode indisponible." });
      if (request.headers.origin && new URL(request.headers.origin).host !== request.headers.host) {
        return send(403, { error: "Origine de la requête invalide." });
      }
      if (!request.headers["content-type"]?.startsWith("application/json")) {
        return send(415, { error: "Requête JSON attendue." });
      }

      let body = "";
      for await (const chunk of request) {
        body += chunk.toString();
        if (Buffer.byteLength(body) > 8192) return send(413, { error: "Requête trop longue." });
      }
      let input: Record<string, unknown>;
      try {
        input = JSON.parse(body || "{}");
        if (!input || typeof input !== "object" || Array.isArray(input)) throw Error();
      } catch {
        return send(400, { error: "Requête invalide." });
      }

      if (path === "/api/auth/logout") {
        if (token) sessions.delete(token);
        response.setHeader("Set-Cookie", cookie(request, "", 0));
        return send(200, { ok: true });
      }

      if (path === "/api/auth/login") {
        const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
        const password = typeof input.password === "string" ? input.password : "";
        const attemptKey = (request.socket.remoteAddress || "") + ":" + email;
        const previousAttempt = attempts.get(attemptKey);
        if (previousAttempt && previousAttempt.expires > Date.now() && previousAttempt.count >= 10) {
          return send(429, { error: "Trop de tentatives. Réessaie dans 15 minutes." });
        }
        const records = await loadAccounts();
        const record = records[email];
        if (!allowedEmails.has(email) || password.length > 128 || (record && !(await verify(password, record)))) {
          attempts.set(attemptKey, {
            count: previousAttempt && previousAttempt.expires > Date.now() ? previousAttempt.count + 1 : 1,
            expires: previousAttempt && previousAttempt.expires > Date.now() ? previousAttempt.expires : Date.now() + 900000,
          });
          return send(401, { error: "Adresse e-mail ou mot de passe incorrect." });
        }
        attempts.delete(attemptKey);
        if (token) sessions.delete(token);
        for (const [key, value] of sessions) {
          if (value.expires <= Date.now()) sessions.delete(key);
        }
        const newToken = randomBytes(32).toString("hex");
        sessions.set(newToken, { email, expires: Date.now() + sessionDuration });
        response.setHeader("Set-Cookie", cookie(request, newToken, sessionDuration / 1000));
        return send(200, { user: { email, hasPassword: !!record } });
      }

      if (path === "/api/auth/password") {
        if (!currentSession) return send(401, { error: "Reconnecte-toi pour définir ton mot de passe." });
        const password = input.password;
        const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
        if (typeof password !== "string" || password.length < 10 || password.length > 128 || currentPassword.length > 128) {
          return send(400, { error: "Choisis un mot de passe de 10 à 128 caractères." });
        }
        const operation = writes.then(async () => {
          const records = await loadAccounts();
          const existing = records[currentSession.email];
          if (existing && !(await verify(currentPassword, existing))) {
            return send(403, { error: "Le mot de passe actuel est incorrect." });
          }
          const salt = randomBytes(16).toString("hex");
          const hash = (await scrypt(password, salt, 64) as Buffer).toString("hex");
          records[currentSession.email] = { salt, hash };
          await mkdir(dirname(accountsFile), { recursive: true, mode: 0o700 });
          const temp = accountsFile + "." + randomBytes(8).toString("hex") + ".tmp";
          await writeFile(temp, JSON.stringify(records), { mode: 0o600 });
          await rename(temp, accountsFile);
          for (const [key, value] of sessions) {
            if (value.email === currentSession.email && key !== token) sessions.delete(key);
          }
          send(200, { ok: true });
        });
        writes = operation.catch(() => {});
        await operation;
        return;
      }
      send(404, { error: "Page introuvable." });
    } catch {
      send(500, { error: "Le service de connexion est indisponible. Réessaie." });
    }
  };

  return {
    name: "sprintly-auth-api",
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}
