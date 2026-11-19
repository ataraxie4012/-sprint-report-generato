import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DocumentHistoryItem } from "../src/documentHistory.js";

type Project = {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  members: string[];
  documents: DocumentHistoryItem[];
};

function validDocument(value: unknown): value is DocumentHistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as DocumentHistoryItem;
  return typeof item.id === "string" && item.id.length > 0 && item.id.length <= 100
    && (item.type === "test" || item.type === "minutes")
    && typeof item.title === "string" && item.title.length <= 200
    && typeof item.date === "string" && item.date.length <= 30
    && typeof item.notes === "string" && item.notes.length <= 20000
    && !!item.fields && typeof item.fields === "object" && !Array.isArray(item.fields)
    && Object.keys(item.fields).length <= 30
    && Object.values(item.fields).every(text => typeof text === "string" && text.length <= 100000);
}

export function createProjectsHandler(root: string) {
  const directory = join(root, ".data");
  const file = join(directory, "projects.json");
  let mutations: Promise<unknown> = Promise.resolve();

  const readProjects = async (): Promise<Project[]> => {
    try {
      const result: unknown = JSON.parse(await readFile(file, "utf8"));
      if (!Array.isArray(result) || !result.every(project =>
        project && typeof project.id === "string" && typeof project.name === "string"
        && typeof project.createdAt === "string" && typeof project.createdBy === "string"
        && Array.isArray(project.members) && project.members.every((member: unknown) => typeof member === "string")
        && Array.isArray(project.documents) && project.documents.every(validDocument)
      )) throw Error("Projets invalides.");
      return result;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  };

  return async (request: IncomingMessage, response: ServerResponse, email: string) => {
    const send = (status: number, body: unknown) => {
      response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify(body));
    };
    const parts = request.url?.split("?")[0].split("/").filter(Boolean) || [];
    try {
      if (request.method === "GET") {
        const projects = await readProjects();
        if (parts.length === 2) {
          return send(200, { projects: projects.map(project => ({
            id: project.id, name: project.name, createdAt: project.createdAt,
            joined: project.members.includes(email),
            canDelete: project.createdBy === email,
            documentCount: project.members.includes(email) ? project.documents.length : undefined,
          })) });
        }
        const project = projects.find(item => item.id === parts[2]);
        if (!project) return send(404, { error: "Projet introuvable." });
        if (!project.members.includes(email)) return send(403, { error: "Rejoins ce projet pour consulter ses documents." });
        if (parts.length === 4 && parts[3] === "documents") {
          return send(200, { documents: project.documents });
        }
        return send(404, { error: "Page introuvable." });
      }
      if (request.method !== "POST") return send(405, { error: "Méthode indisponible." });
      if (request.headers.origin && new URL(request.headers.origin).host !== request.headers.host) {
        return send(403, { error: "Origine invalide." });
      }
      if (!request.headers["content-type"]?.startsWith("application/json")) {
        return send(415, { error: "Requête JSON attendue." });
      }
      let raw = "";
      for await (const chunk of request) {
        raw += chunk.toString();
        if (Buffer.byteLength(raw) > 500000) return send(413, { error: "Le document est trop volumineux." });
      }
      let body;
      try {
        body = JSON.parse(raw);
        if (!body || typeof body !== "object" || Array.isArray(body)) throw Error();
      } catch {
        return send(400, { error: "Requête invalide." });
      }

      const operation = mutations.then(async () => {
        const projects = await readProjects();
        let result: unknown;
        if (parts.length === 2) {
          const name = typeof body.name === "string" ? body.name.trim() : "";
          if (!name || name.length > 100) return send(400, { error: "Choisis un nom de projet de 1 à 100 caractères." });
          if (projects.some(project => project.name.toLocaleLowerCase("fr-FR") === name.toLocaleLowerCase("fr-FR"))) {
            return send(409, { error: "Un projet porte déjà ce nom." });
          }
          const project: Project = {
            id: randomUUID(), name, createdAt: new Date().toISOString(),
            createdBy: email, members: [email], documents: [],
          };
          projects.push(project);
          result = { project: { ...project, documents: undefined, members: undefined, joined: true, canDelete: true, documentCount: 0 } };
        } else {
          const project = projects.find(item => item.id === parts[2]);
          if (!project) return send(404, { error: "Projet introuvable." });
          if (parts.length === 4 && parts[3] === "delete") {
            if (project.createdBy !== email) {
              return send(403, { error: "Seul le créateur peut supprimer ce projet." });
            }
            projects.splice(projects.findIndex(item => item.id === project.id), 1);
            result = { ok: true };
          } else if (parts.length === 4 && parts[3] === "membership") {
            if (typeof body.joined !== "boolean") return send(400, { error: "Choix d’accès invalide." });
            project.members = project.members.filter(member => member !== email);
            if (body.joined) project.members.push(email);
            result = { ok: true };
          } else if (parts.length === 5 && parts[3] === "documents" && parts[4] === "delete") {
            if (!project.members.includes(email)) return send(403, { error: "Rejoins ce projet pour supprimer un document." });
            if (typeof body.id !== "string" || !body.id || body.id.length > 100) {
              return send(400, { error: "Document invalide." });
            }
            project.documents = project.documents.filter(item => item.id !== body.id);
            result = { documents: project.documents };
          } else if (parts.length === 4 && parts[3] === "documents") {
            if (!project.members.includes(email)) return send(403, { error: "Rejoins ce projet pour enregistrer un document." });
            if (!validDocument(body.document)) return send(400, { error: "Le document est invalide ou trop long." });
            const document = { ...body.document, savedAt: new Date().toISOString() };
            project.documents = [document, ...project.documents.filter(item => item.id !== document.id)];
            result = { documents: project.documents };
          } else {
            return send(404, { error: "Page introuvable." });
          }
        }
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const temporary = file + "." + randomUUID() + ".tmp";
        await writeFile(temporary, JSON.stringify(projects), { mode: 0o600 });
        await rename(temporary, file);
        send(200, result);
      });
      mutations = operation.catch(() => {});
      await operation;
    } catch {
      send(500, { error: "Impossible d’enregistrer ou de lire les projets. Réessaie." });
    }
  };
}
