import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import lockfile from "proper-lockfile";

// Heartbeat et récupération des verrous abandonnés, communs aux processus.
export async function withDataLock(root, resource, operation) {
  const directory = join(root, ".data");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const release = await lockfile.lock(join(directory, resource), {
    realpath: false, stale: 30000, update: 10000,
    retries: { retries: 100, minTimeout: 25, maxTimeout: 100, randomize: true },
  });
  try { return await operation(); }
  finally { await release(); }
}

export function withAccountLock(root, operation) {
  return withDataLock(root, "accounts", operation);
}
