import { withAccountLock } from "./accountLock.js";
import { createProjectsHandler } from "./projectsApi.js";
import { createSprintsHandler } from "./sprintsApi.js";
import { hashPassword, verifyPassword, temporaryLifetime } from "./passwords.js";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { directSprintEmails, documentEmails } from "../src/accessRoutes.js";
import { audit, digest, HttpError, isHttps, production, readBody, securityHeaders, securityStore, validateMutation } from "./security.js";
import { readJson, writeJson } from "./storage.js";

type PasswordRecord = { salt: string; hash: string; algorithm?: "scrypt-v2"; mustChangePassword?: boolean; temporaryExpiresAt?: number };
const allowedEmails = new Set([...directSprintEmails, ...documentEmails]);
const cookieName = "sprintly_session";
const sessionDuration = 12 * 3600000;

export function createAuthHandler(root: string) {
  const projects = createProjectsHandler(root);
  const sprints = createSprintsHandler(root);
  const file = join(root, ".data", "accounts.json");
  const store = securityStore(root);
  const loadAccounts = async () => {
    const records = await readJson<Record<string, PasswordRecord>>(file, {});
    if (!records || Array.isArray(records) || typeof records !== "object" || !Object.values(records).every(record =>
      record && /^[a-f0-9]{32}$/.test(record.salt) && /^[a-f0-9]{128}$/.test(record.hash)
      && (record.algorithm === undefined || record.algorithm === "scrypt-v2")
      && (record.mustChangePassword === undefined || typeof record.mustChangePassword === "boolean")
      && (record.temporaryExpiresAt === undefined || Number.isFinite(record.temporaryExpiresAt))
    )) throw Error("Fichier de comptes invalide.");
    return records;
  };
  // Migration des temporaires existants, sans remplacer leurs mots de passe.
  const initialize = () => withAccountLock(root, async () => {
    const records = await loadAccounts();
    let changed = false;
    for (const record of Object.values(records)) {
      if (record.mustChangePassword && record.temporaryExpiresAt === undefined) {
        record.temporaryExpiresAt = Date.now() + temporaryLifetime;
        changed = true;
      }
    }
    if (changed) await writeJson(file, records, true);
  });
  let ready: Promise<void> | undefined;
  const expired = (record: PasswordRecord) => record.mustChangePassword
    && (!record.temporaryExpiresAt || record.temporaryExpiresAt <= Date.now());
  const cookie = (request: IncomingMessage, token: string, maxAge: number) =>
    `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`
    + (production() || isHttps(request) ? "; Secure" : "");

  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    securityHeaders(response);
    const path = request.url?.split("?")[0];
    const isProjects = path === "/api/projects" || path?.startsWith("/api/projects/");
    const isSprints = path === "/api/sprints";
    const isMinutes = path === "/api/generate-minutes";
    if (!path?.startsWith("/api/auth/") && !isProjects && !isMinutes && !isSprints) return next();
    const send = (status: number, data: unknown) => {
      response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify(data));
    };
    try {
      if (production() && !isHttps(request)) throw new HttpError(400, "Une connexion HTTPS est requise.");
      validateMutation(request);
      ready ||= initialize().catch(error => { ready = undefined; throw error; });
      await ready;
      const token = (request.headers.cookie || "").split(";").map(part => part.trim())
        .find(part => part.startsWith(cookieName + "="))?.slice(cookieName.length + 1) || "";
      let session = /^[a-f0-9]{64}$/.test(token) ? await store.session(token) : undefined;
      const records = await loadAccounts();
      const record = session ? records[session.email] : undefined;
      if (session && (!allowedEmails.has(session.email) || !record || expired(record) || session.version !== digest(record.hash))) {
        await store.revoke(token);
        session = undefined;
      }
      if (isProjects || isMinutes || isSprints) {
        if (!session) throw new HttpError(401, "Reconnecte-toi pour accéder à ton espace.");
        if (record!.mustChangePassword) throw new HttpError(403, "Change ton mot de passe temporaire avant d’accéder à ton espace.");
        if (isMinutes) {
          if (request.method !== "POST") throw new HttpError(405, "Méthode indisponible.");
          await store.rate([
            { key: "ai:user:" + session.email, max: 20, duration: 86400000 },
            { key: "ai:global", max: 200, duration: 86400000 },
          ]);
          const release = await store.lease("ai", 2);
          let released = false;
          const finish = () => { if (!released) { released = true; void release().catch(() => {}); } };
          response.once("finish", finish);
          response.once("close", finish);
          await audit(root, "minutes.generate", session.email);
          return next();
        }
        await store.rate([{ key: "api:" + session.email, max: 300, duration: 60000 }]);
        return isSprints ? await sprints(request, response, session.email) : await projects(request, response, session.email);
      }
      if (request.method === "GET" && path === "/api/auth/session") {
        return send(200, { user: session ? { email: session.email, hasPassword: true, mustChangePassword: !!record!.mustChangePassword } : null });
      }
      if (request.method !== "POST") throw new HttpError(405, "Méthode indisponible.");
      const input = await readBody(request, 8192);
      if (path === "/api/auth/logout") {
        if (token) await store.revoke(token);
        response.setHeader("Set-Cookie", cookie(request, "", 0));
        return send(200, { ok: true });
      }
      if (path === "/api/auth/login") {
        const email = typeof input.email === "string" ? input.email.trim().toLowerCase().slice(0, 254) : "";
        const password = typeof input.password === "string" ? input.password : "";
        await store.rate([
          { key: "login:account:" + email, max: 10, duration: 900000 },
          { key: "login:source:" + request.socket.remoteAddress, max: 100, duration: 900000 },
          { key: "login:global", max: 300, duration: 900000 },
        ]);
        const release = await store.lease("password", 2);
        try {
          const account = records[email];
          if (!allowedEmails.has(email) || !account || password.length > 128 || expired(account)
            || !(await verifyPassword(password, account))) {
            await audit(root, "login", email, false);
            throw new HttpError(401, "Adresse e-mail ou mot de passe incorrect, ou mot de passe temporaire expiré.");
          }
          // Migration du hash historique lors d’une connexion réussie.
          const current = await withAccountLock(root, async () => {
            const latest = await loadAccounts();
            if (!latest[email] || latest[email].hash !== account.hash) throw new HttpError(401, "Le mot de passe a changé. Reconnecte-toi.");
            if (account.algorithm !== "scrypt-v2") {
              latest[email] = { ...account, ...await hashPassword(password) };
              await writeJson(file, latest, true);
            }
            return latest[email];
          });
          if (token) await store.revoke(token);
          const newToken = randomBytes(32).toString("hex");
          await store.createSession(newToken, { email, expires: Date.now() + sessionDuration, lastSeen: Date.now(), version: digest(current.hash) });
          response.setHeader("Set-Cookie", cookie(request, newToken, sessionDuration / 1000));
          await audit(root, "login", email);
          return send(200, { user: { email, hasPassword: true, mustChangePassword: !!current.mustChangePassword } });
        } finally { await release(); }
      }
      if (path === "/api/auth/password") {
        if (!session) throw new HttpError(401, "Reconnecte-toi pour définir ton mot de passe.");
        const password = input.password;
        const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
        if (typeof password !== "string" || password.length < 10 || password.length > 128 || currentPassword.length > 128) {
          throw new HttpError(400, "Choisis un mot de passe de 10 à 128 caractères.");
        }
        await store.rate([{ key: "password:" + session.email, max: 10, duration: 900000 }]);
        const release = await store.lease("password", 2);
        try {
          const accountEmail = session.email;
          const version = await withAccountLock(root, async () => {
            const latest = await loadAccounts();
            const existing = latest[accountEmail];
            if (!existing || expired(existing) || session!.version !== digest(existing.hash)
              || !(await verifyPassword(currentPassword, existing))) {
              await audit(root, "password.change", accountEmail, false);
              throw new HttpError(403, "Le mot de passe actuel est incorrect.");
            }
            if (password === currentPassword) throw new HttpError(400, "Choisis un mot de passe différent du mot de passe actuel.");
            const updated = { ...await hashPassword(password), mustChangePassword: false };
            latest[accountEmail] = updated;
            await writeJson(file, latest, true);
            return digest(updated.hash);
          });
          await store.revokeOthers(accountEmail, token, version);
          await audit(root, "password.change", accountEmail);
          return send(200, { ok: true });
        } finally { await release(); }
      }
      throw new HttpError(404, "Page introuvable.");
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 429) response.setHeader("Retry-After", "60");
      send(status, { error: error instanceof HttpError ? error.message : "Le service est indisponible. Réessaie." });
    }
  };
}

export function authApi(root: string): Plugin {
  const middleware = createAuthHandler(root);
  return { name: "sprintly-auth-api",
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}
