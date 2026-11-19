import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile, readdir, stat, unlink, copyFile } from "node:fs/promises";
import { join, dirname, basename } from "node:path";

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

// Appeler sous le verrou de la ressource. Copies de récupération à accès restreint.
export async function writeJson(file: string, value: unknown, backup = false) {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  if (backup) {
    const directory = join(dirname(file), "backups");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    try { await copyFile(file, join(directory, `${Date.now()}-${randomUUID()}-${basename(file)}`)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    const entries = await Promise.all((await readdir(directory)).map(async name => {
      const path = join(directory, name);
      try { return { path, info: await stat(path) }; }
      catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
    }));
    const existing = entries.filter(entry => entry !== null);
    existing.sort((a, b) => b.info.mtimeMs - a.info.mtimeMs);
    let size = 0;
    for (let i = 0; i < existing.length; i++) {
      const entry = existing[i];
      size += entry.info.size;
      if (i >= 50 || size > 250_000_000 || entry.info.mtimeMs < Date.now() - 30 * 86400000) await unlink(entry.path).catch(error => { if (error.code !== "ENOENT") throw error; });
    }
  }
  const temporary = file + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temporary, JSON.stringify(value), { mode: 0o600, flag: "wx" });
    await rename(temporary, file);
  } finally { await unlink(temporary).catch(() => {}); }
}
