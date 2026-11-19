import { createContext, useContext } from "react";

export type AppAlert = {
  title: string;
  message: string;
  tone?: "success" | "error" | "info";
};
export const AlertContext = createContext<((alert: AppAlert) => void) | null>(null);
export function useAlert() {
  const showAlert = useContext(AlertContext);
  if (!showAlert) throw new Error("Le service de fenêtres de notification est indisponible.");
  return showAlert;
}
