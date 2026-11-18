import type { SprintPage } from "./SprintNavigation";
import { useState } from "react";
import type { FormEvent } from "react";
import App from "./App";
import DocumentHub from "./DocumentHub";
import { canOpenBothWorkspaces, workspaceForEmail } from "./accessRoutes";
import type { WorkspaceRoute } from "./accessRoutes";
import webwagLogo from "./webwag.svg";
import "./Login.css";

export default function Login() {
  const [workspace, setWorkspace] = useState<WorkspaceRoute | null>(null);
  const [connectedEmail, setConnectedEmail] = useState("");
  const [email, setEmail] = useState("");
  const [requestedSprintPage, setRequestedSprintPage] =
    useState<{ page: SprintPage }>({ page: "general" });

  const openDemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setConnectedEmail(normalizedEmail);
    setRequestedSprintPage({ page: "general" });
    setWorkspace(workspaceForEmail(normalizedEmail));
  };

  const signOut = () => {
    setWorkspace(null);
    setConnectedEmail("");
    setEmail("");
  };

  if (workspace && canOpenBothWorkspaces(connectedEmail)) {
    return (
      <>
        <div hidden={workspace !== "sprint"}>
          <App
            email={connectedEmail}
            requestedSprintPage={requestedSprintPage}
            onSignOut={signOut}
            onOpenDocuments={() => setWorkspace("documents")}
          />
        </div>
        <div hidden={workspace !== "documents"}>
          <DocumentHub
            email={connectedEmail}
            onSignOut={signOut}
            onOpenSprint={page => {
              setRequestedSprintPage({ page });
              setWorkspace("sprint");
            }}
          />
        </div>
      </>
    );
  }

  if (workspace === "sprint") return <App email={connectedEmail} onSignOut={signOut} />;
  if (workspace === "documents") {
    return <DocumentHub email={connectedEmail} onSignOut={signOut} />;
  }

  return (
    <main className="login-page">
      <section className="login-story" aria-labelledby="login-story-title">
        <div className="login-brand">
          <img src={webwagLogo} alt="Webwag" width={56} height={50} />
          <div>
            <strong>Sprintly</strong>
            <span>GESTION DES SPRINTS</span>
          </div>
        </div>

        <div className="login-story-content">
          <h1 id="login-story-title">
            Tes sprints.<br />
            Une vision <em>claire.</em>
          </h1>
          <p>
            L’espace interne des équipes Webwag pour préparer les bilans
            de sprint, retrouver les rapports et suivre les progrès.
          </p>

          <div className="login-report-example" aria-label="Exemple de bilan de sprint">
            <div className="login-example-heading">
              <strong>Sprint 145</strong>
              <span>Bilan du sprint</span>
            </div>
            <dl className="login-example-metrics">
              <div><dt>Prévu</dt><dd>48 <small>pts</small></dd></div>
              <div><dt>Réalisé</dt><dd>61 <small>pts</small></dd></div>
              <div><dt>Écart</dt><dd>+13 <small>pts</small></dd></div>
            </dl>
            <div className="login-example-footer">
              <span>Objectif atteint</span>
              <strong>127 %</strong>
            </div>
          </div>
        </div>
        <span className="login-signature">Créé par Webwag, pour les équipes Webwag.</span>
      </section>

      <section className="login-access" aria-labelledby="login-title">
        <form className="login-form" onSubmit={openDemo}>
          <div className="login-form-heading">
            <h2 id="login-title">Bienvenue sur Sprintly</h2>
            <p>Accède à ton espace Webwag.</p>
          </div>

          <div className="login-field">
            <label htmlFor="login-email">Adresse e-mail Webwag</label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder="prenom.nom@webwag.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <button className="button button-primary login-submit" type="submit">
            Accéder à mon espace <span aria-hidden="true">→</span>
          </button>

          <button
            className="button button-secondary login-direct-access"
            type="button"
            onClick={() => setWorkspace("sprint")}
          >
            Ouvrir la démo du rapport de sprint
          </button>
          <p className="login-demo-note">
            Mode démonstration. L’e-mail choisit le parcours d’accueil.
            L’identité et les droits d’accès devront être vérifiés
            par un service d’authentification.
          </p>
        </form>
      </section>
    </main>
  );
}
