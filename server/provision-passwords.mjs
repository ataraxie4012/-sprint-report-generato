import { randomBytes } from "node:crypto";
import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword, temporaryLifetime } from "./passwords.js";
import { directSprintEmails, documentEmails } from "../src/accessRoutes.ts";
import { withAccountLock } from "./accountLock.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = resolve(process.argv.slice(2).find(argument => !argument.startsWith("--")) || join(root, ".data", "temporary-passwords.txt"));

const emails = [...new Set([...directSprintEmails, ...documentEmails])];
const accountsFile = join(root, ".data", "accounts.json");

await withAccountLock(root, async () => {
  let records = {};
  try { records = JSON.parse(await readFile(accountsFile, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (!records || Array.isArray(records) || typeof records !== "object"
    || !Object.values(records).every(record =>
      record && /^[a-f0-9]{32}$/.test(record.salt) && /^[a-f0-9]{128}$/.test(record.hash)
    )) throw new Error("Le fichier des comptes est invalide.");

  const credentials = [];
  for (const email of emails) {
    if (records[email] && !(process.argv.includes("--renew-expired") && records[email].mustChangePassword && records[email].temporaryExpiresAt <= Date.now())) continue;
    const password = randomBytes(18).toString("base64url");
    records[email] = { ...await hashPassword(password), mustChangePassword: true, temporaryExpiresAt: Date.now() + temporaryLifetime };
    credentials.push(email + "\t" + password);
  }
  if (!credentials.length) {
    process.stdout.write("Tous les comptes possèdent déjà un mot de passe. Aucune modification.\n");
    return;
  }
  const text = "SPRINTLY — MOTS DE PASSE TEMPORAIRES\n"
    + "Un mot de passe unique par utilisateur. Expiration sous 7 jours. Changement obligatoire à la première connexion.\n"
    + "Transmettre à chaque utilisateur uniquement sa propre ligne.\n\n"
    + "Adresse e-mail\tMot de passe temporaire\n"
    + credentials.join("\n") + "\n";
  await writeFile(destination, text, { flag: "wx", mode: 0o600 });
  try {
    const temporary = accountsFile + "." + randomBytes(8).toString("hex") + ".tmp";
    await writeFile(temporary, JSON.stringify(records), { mode: 0o600 });
    await rename(temporary, accountsFile);
  } catch (error) {
    await unlink(destination);
    throw error;
  }
  process.stdout.write(credentials.length + " comptes préparés. "
    + (emails.length - credentials.length) + " mots de passe existants conservés.\n");
});
