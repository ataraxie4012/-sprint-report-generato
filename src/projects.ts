export type ProjectSummary = {
  id: string;
  name: string;
  joined: boolean;
  canDelete: boolean;
  createdAt: string;
  documentCount?: number;
};

export async function projectRequest(path = "", body?: unknown) {
  const response = await fetch("/api/projects" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error("Le service Projets est indisponible. Redémarre le serveur."); }
  if (!response.ok) throw new Error(result.error || "La requête a échoué.");
  return result;
}
