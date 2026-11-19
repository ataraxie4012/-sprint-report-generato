import { useEffect, useState } from "react";
import App from "./App";
import type { SprintSnapshot } from "./App";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof App>, "initialSnapshot">;
export default function SprintWorkspace(props: Props) {
  const [snapshot, setSnapshot] = useState<SprintSnapshot | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/sprints", { credentials: "same-origin", signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw Error(result.error || "Impossible de charger tes sprints.");
        if (!controller.signal.aborted) setSnapshot(result);
      }).catch(cause => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Chargement impossible.");
      });
    return () => controller.abort();
  }, [props.email, attempt]);
  if (snapshot) return <App {...props} initialSnapshot={snapshot} />;
  return <main className="login-session-loading" role="status">
    <div>{error || "Chargement de tes sprints…"}
      {error && <button className="button" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Réessayer</button>}
      <button className="button button-quiet" onClick={props.onSignOut}>Déconnexion</button>
    </div>
  </main>;
}
