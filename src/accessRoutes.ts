export type WorkspaceRoute = "sprint" | "documents";

// Adresses qui ouvrent directement le rapport de sprint.
// Cette configuration pilote la démonstration. Les droits réels devront être
// vérifiés par le service d’authentification.
export const directSprintEmails: string[] = [
  "manon.fargues@webwag.com",
  "mathieu.lauga@webwag.com",
  "victoria.falcon@webwag.com",
  "denisb@webwag.com",
];

export function workspaceForEmail(email: string): WorkspaceRoute {
  const normalizedEmail = email.trim().toLowerCase();
  return directSprintEmails.some(
    (address) => address.trim().toLowerCase() === normalizedEmail
  ) ? "sprint" : "documents";
}

export function canOpenBothWorkspaces(email: string): boolean {
  return [
    "denisb@webwag.com",
    "manon.fargues@webwag.com",
  ].includes(email.trim().toLowerCase());
}
