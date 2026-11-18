export type DocumentHistoryItem = {
  id: string;
  savedAt: string;
  type: "test" | "minutes";
  title: string;
  date: string;
  fields: Record<string, string>;
  notes: string;
};

export const documentHistoryKey = (email: string) =>
  "sprintly-document-history:" + email.trim().toLowerCase();

export function readDocumentHistory(email: string): DocumentHistoryItem[] {
  const raw = localStorage.getItem(documentHistoryKey(email));
  if (!raw) return [];
  const records: unknown = JSON.parse(raw);
  if (!Array.isArray(records) || !records.every(item =>
    item && typeof item.id === "string" && typeof item.savedAt === "string"
    && (item.type === "test" || item.type === "minutes")
    && typeof item.title === "string" && typeof item.date === "string"
    && typeof item.notes === "string" && item.fields
    && typeof item.fields === "object" && !Array.isArray(item.fields)
    && Object.values(item.fields).every(value => typeof value === "string")
  )) throw new Error("Historique invalide.");
  return records;
}

export function saveDocumentHistoryItem(email: string, item: DocumentHistoryItem) {
  const records = [
    item,
    ...readDocumentHistory(email).filter(previous => previous.id !== item.id),
  ];
  localStorage.setItem(documentHistoryKey(email), JSON.stringify(records));
  return records;
}
