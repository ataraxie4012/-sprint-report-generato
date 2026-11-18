export type SessionUser = { email: string; hasPassword: boolean };

export async function authRequest(path: string, body?: unknown) {
  const response = await fetch("/api/auth/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Le service de connexion est indisponible. Redémarre le serveur de l’application.");
  }
  if (!response.ok) throw new Error(result.error || "La requête a échoué.");
  return result;
}
