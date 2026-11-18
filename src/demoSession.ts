import type { WorkspaceRoute } from "./accessRoutes";
import type { SprintPage } from "./SprintNavigation";

export type DemoSession = {
  workspace: WorkspaceRoute;
  email: string;
  page: SprintPage;
};

const storageKey = "sprintly-demo-session";

export function readDemoSession(): DemoSession | null {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value || (value.workspace !== "sprint" && value.workspace !== "documents")
      || typeof value.email !== "string"
      || (value.page !== "general" && value.page !== "history")) return null;
    return value;
  } catch {
    return null;
  }
}

export function saveDemoSession(session: DemoSession | null) {
  try {
    if (session) sessionStorage.setItem(storageKey, JSON.stringify(session));
    else sessionStorage.removeItem(storageKey);
  } catch {
    // La navigation en mémoire reste disponible si le stockage est bloqué.
  }
}
