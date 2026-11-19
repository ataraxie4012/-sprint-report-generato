import { scrypt as scryptCallback, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export const passwordParameters = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
export const temporaryLifetime = 7 * 86400000;
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64, passwordParameters)).toString("hex");
  return { salt, hash, algorithm: /** @type {"scrypt-v2"} */ ("scrypt-v2") };
}
export async function verifyPassword(password, record) {
  const parameters = record.algorithm === "scrypt-v2" ? passwordParameters : {};
  const hash = await scrypt(password, record.salt, 64, parameters);
  return timingSafeEqual(hash, Buffer.from(record.hash, "hex"));
}
