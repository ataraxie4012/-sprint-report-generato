import { createHash, randomBytes } from "node:crypto";
import { appendFile, stat, rename } from "node:fs/promises";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { withDataLock } from "./accountLock.js";
import { readJson, writeJson } from "./storage.js";

export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export type Session = { email: string; expires: number; lastSeen: number; version: string };
type State = {
  rates: Record<string, { count: number; expires: number }>;
  sessions: Record<string, Session>;
  leases: Record<string, { category: string; expires: number }>;
};
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export const production = () => process.env.NODE_ENV === "production";
export function isHttps(request: IncomingMessage) {
  return !!(request.socket as { encrypted?: boolean }).encrypted
    || (process.env.TRUST_PROXY === "1" && request.headers["x-forwarded-proto"] === "https");
}
export function validateMutation(request: IncomingMessage) {
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(request.method || "")) return;
  const expected = process.env.APP_ORIGIN || `${isHttps(request) ? "https" : "http"}://${request.headers.host}`;
  if (!request.headers.origin || request.headers.origin !== new URL(expected).origin
    || request.headers["sec-fetch-site"] === "cross-site") {
    throw new HttpError(403, "Origine de la requête invalide.");
  }
  if (request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new HttpError(415, "Requête JSON attendue.");
  }
}
export function securityHeaders(response: ServerResponse, prod = production()) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "same-origin");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (prod) {
    response.setHeader("Strict-Transport-Security", "max-age=31536000");
    response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-src 'self' about:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  }
}
export async function readBody(request: IncomingMessage, limit: number) {
  let bytes = 0;
  const parts: Buffer[] = [];
  for await (const chunk of request) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += part.length;
    if (bytes > limit) throw new HttpError(413, "Le contenu envoyé est trop volumineux.");
    parts.push(part);
  }
  try {
    const value = JSON.parse(Buffer.concat(parts).toString("utf8") || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) throw Error();
    return value as Record<string, unknown>;
  } catch { throw new HttpError(400, "Requête invalide."); }
}

export function securityStore(root: string) {
  const file = join(root, ".data", "security.json");
  const transaction = <T>(operation: (state: State) => T) => withDataLock(root, "security", async () => {
    const state = await readJson<State>(file, { rates: {}, sessions: {}, leases: {} });
    const now = Date.now();
    for (const [key, rate] of Object.entries(state.rates)) if (rate.expires <= now) delete state.rates[key];
    for (const [key, session] of Object.entries(state.sessions)) {
      if (session.expires <= now || session.lastSeen + 2 * 3600000 <= now) delete state.sessions[key];
    }
    for (const [key, lease] of Object.entries(state.leases)) if (lease.expires <= now) delete state.leases[key];
    const result = operation(state);
    await writeJson(file, state);
    return result;
  });
  return {
    async rate(items: { key: string; max: number; duration: number }[]) {
      const allowed = await transaction(state => {
        if (Object.keys(state.rates).length + items.length > 10000) return false;
        if (items.some(item => (state.rates[digest(item.key)]?.count || 0) >= item.max)) return false;
        for (const item of items) {
          const key = digest(item.key);
          const rate = state.rates[key] ||= { count: 0, expires: Date.now() + item.duration };
          rate.count++;
        }
        return true;
      });
      if (!allowed) throw new HttpError(429, "Limite de tentatives atteinte. Réessaie plus tard.");
    },
    async lease(category: string, max: number, duration = 120000) {
      const id = randomBytes(16).toString("hex");
      const allowed = await transaction(state => {
        if (Object.values(state.leases).filter(lease => lease.category === category).length >= max) return false;
        state.leases[id] = { category, expires: Date.now() + duration };
        return true;
      });
      if (!allowed) throw new HttpError(429, "Le service est occupé. Réessaie dans un instant.");
      return () => transaction(state => { delete state.leases[id]; });
    },
    session: (token: string) => transaction(state => {
      const session = state.sessions[digest(token)];
      if (session) session.lastSeen = Date.now();
      return session;
    }),
    createSession: (token: string, session: Session) => transaction(state => {
      if (Object.keys(state.sessions).length >= 2000) throw new HttpError(429, "Trop de sessions actives.");
      const own = Object.entries(state.sessions).filter(([, value]) => value.email === session.email)
        .sort((a, b) => a[1].lastSeen - b[1].lastSeen);
      while (own.length >= 5) delete state.sessions[own.shift()![0]];
      state.sessions[digest(token)] = session;
    }),
    revoke: (token: string) => transaction(state => { delete state.sessions[digest(token)]; }),
    revokeOthers: (email: string, token: string, version: string) => transaction(state => {
      for (const [key, session] of Object.entries(state.sessions)) {
        if (session.email !== email) continue;
        if (key === digest(token)) session.version = version;
        else delete state.sessions[key];
      }
    }),
  };
}

export async function audit(root: string, event: string, email = "", success = true) {
  await withDataLock(root, "audit", async () => {
    const file = join(root, ".data", "audit.jsonl");
    try { if ((await stat(file)).size > 5_000_000) await rename(file, file + ".1"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    await appendFile(file, JSON.stringify({ at: new Date().toISOString(), event, account: digest(email), success }) + "\n", { mode: 0o600 });
  });
}
