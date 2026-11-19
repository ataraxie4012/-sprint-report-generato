import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { directSprintEmails } from "../src/accessRoutes.js";
import { withDataLock } from "./accountLock.js";
import { digest, HttpError, readBody } from "./security.js";
import { readJson, writeJson } from "./storage.js";

const text = (value: unknown, limit = 20000) => typeof value === "string" && value.length <= limit;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1000000;
function validData(value: unknown) {
  if (!object(value)) return false;
  if (value.activeHistoryId !== undefined && value.activeHistoryId !== null && !text(value.activeHistoryId, 100)) return false;
  if (value.sprint !== undefined) {
    if (!object(value.sprint)) return false;
    const strings = ["name", "startDate", "endDate", "objectives", "reportLink", "signatories"];
    const numbers = ["plannedVelocity", "actualVelocity", "startTickets", "startPoints", "addedTickets", "addedPoints", "reestimatedTickets", "reestimatedPoints", "bugPoints"];
    if (!Object.entries(value.sprint).every(([key, item]) => strings.includes(key) ? text(item) : numbers.includes(key) && number(item))) return false;
  }
  if (value.releases !== undefined && (!Array.isArray(value.releases) || value.releases.length > 1000 || !value.releases.every(item =>
    object(item) && ["version", "date", "name", "description", "link"].every(key => text(item[key]))))) return false;
  if (value.tickets !== undefined && (!Array.isArray(value.tickets) || value.tickets.length > 5000 || !value.tickets.every(item =>
    object(item) && text(item.key, 200) && text(item.title) && number(item.points)))) return false;
  return true;
}
function validHistory(history: unknown): history is unknown[] {
  return Array.isArray(history) && history.length <= 500 && history.every(item => object(item)
    && text(item.id, 100) && text(item.savedAt, 100) && object(item.sprint) && validData(item));
}

type SprintRecord = { data: Record<string, unknown>; history: unknown[]; revision: number };
export function createSprintsHandler(root: string) {
  return async (request: IncomingMessage, response: ServerResponse, email: string) => {
    if (!directSprintEmails.includes(email)) throw new HttpError(403, "Tu n’as pas accès aux rapports de sprint.");
    const file = join(root, ".data", "sprints", digest(email) + ".json");
    const send = (record: SprintRecord) => {
      response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify(record));
    };
    if (request.method === "GET") return send(await readJson<SprintRecord>(file, { data: {}, history: [], revision: 0 }));
    if (request.method !== "POST") throw new HttpError(405, "Méthode indisponible.");
    const input = await readBody(request, 2_000_000);
    if (!validData(input.data) || !validHistory(input.history) || !Number.isSafeInteger(input.revision)) {
      throw new HttpError(400, "Données de sprint invalides.");
    }
    await withDataLock(root, "sprints-" + digest(email), async () => {
      const previous = await readJson<SprintRecord>(file, { data: {}, history: [], revision: 0 });
      if (previous.revision !== input.revision) throw new HttpError(409, "Ce sprint a été modifié dans un autre onglet. Recharge la page avant de continuer.");
      const updated = { data: input.data as Record<string, unknown>, history: input.history as unknown[], revision: previous.revision + 1 };
      await writeJson(file, updated, true);
      send(updated);
    });
  };
}
