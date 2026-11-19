import { useAlert } from "./alerts";
import PasswordSettings from "./PasswordSettings";
import { authRequest } from "./auth";
import { readDemoSession, saveDemoSession } from "./demoSession";
import type { SprintPage } from "./SprintNavigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import SprintWorkspace from "./SprintWorkspace";
import DocumentHub from "./DocumentHub";
import { canOpenBothWorkspaces, workspaceForEmail } from "./accessRoutes";
import type { WorkspaceRoute } from "./accessRoutes";
import webwagLogo from "./webwag.svg";
import "./Login.css";

export default function Login() {
  const showAlert = useAlert();
  const [initialSession] = useState(readDemoSession);
  const [workspace, setWorkspace] = useState<WorkspaceRoute | null>(
    null
  );
  const [connectedEmail, setConnectedEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [requestedSprintPage, setRequestedSprintPage] =
    useState<{ page: SprintPage }>({ page: initialSession?.page || "general" });

  useEffect(() => {
    let cancelled = false;
    authRequest("session").then(result => {
      if (cancelled || !result.user) return;
      const restoredEmail = result.user.email;
      setConnectedEmail(restoredEmail);
      setMustChangePassword(!!result.user.mustChangePassword);
      setWorkspace(initialSession?.email === restoredEmail
        ? initialSession.workspace
        : workspaceForEmail(restoredEmail));
    }).catch(() => {
      if (!cancelled) setLoginError("Le service de connexion est indisponible. Redémarre le serveur de l’application.");
    }).finally(() => {
      if (!cancelled) setCheckingSession(false);
    });
    return () => { cancelled = true; };
  }, [initialSession]);

  useEffect(() => {
    if (checkingSession) return;
    saveDemoSession(workspace ? {
      workspace, email: connectedEmail, page: requestedSprintPage.page,
    } : null);
  }, [workspace, connectedEmail, requestedSprintPage, checkingSession]);

  const openWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loggingIn) return;
    setLoggingIn(true);
    setLoginError("");
    try {
      const result = await authRequest("login", { email, password });
      setConnectedEmail(result.user.email);
      setMustChangePassword(!!result.user.mustChangePassword);
      setPassword("");
      setRequestedSprintPage({ page: "general" });
      setWorkspace(workspaceForEmail(result.user.email));
    } catch (cause) {
      setLoginError(cause instanceof Error ? cause.message : "La connexion a échoué.");
    } finally {
      setLoggingIn(false);
    }
  };

  const signOut = async () => {
    try {
      await authRequest("logout", {});
      saveDemoSession(null);
      setWorkspace(null);
      setConnectedEmail("");
      setMustChangePassword(false);
      setEmail("");
      setPassword("");
      setLoginError("");
    } catch {
      showAlert({ title: "Déconnexion impossible", message: "La déconnexion a échoué. Réessaie.", tone: "error" });
    }
  };

  if (checkingSession) {
    return <main className="login-session-loading" role="status">Ouverture de ton espace…</main>;
  }

  if (workspace && mustChangePassword) {
    return (
      <main className="first-login-page">
        <section className="first-login-card">
          <div className="login-brand">
            <img src={webwagLogo} alt="Webwag" width={48} height={43} />
            <div><strong>Sprintly</strong><span>PREMIÈRE CONNEXION</span></div>
          </div>
          <h1>Bienvenue sur Sprintly</h1>
          <p className="first-login-email">{connectedEmail}</p>
          <PasswordSettings email={connectedEmail} forceChange
            onChanged={() => setMustChangePassword(false)} />
          <button className="button button-quiet" onClick={signOut}>Déconnexion</button>
        </section>
      </main>
    );
  }

  if (workspace && canOpenBothWorkspaces(connectedEmail)) {
    return (
      <>
        <div hidden={workspace !== "sprint"}>
          <SprintWorkspace
            key={connectedEmail}
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

  if (workspace === "sprint") return <SprintWorkspace key={connectedEmail} email={connectedEmail} onSignOut={signOut} />;
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
        <form className="login-form" onSubmit={openWorkspace}>
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

          <div className="login-field login-password-field">
            <label htmlFor="login-password">Mot de passe</label>
            <input id="login-password" type="password" autoComplete="current-password"
              value={password} maxLength={128} required
              onChange={event => setPassword(event.target.value)} />
          </div>
          {loginError && <p className="login-error" role="alert">{loginError}</p>}
          <button className="button button-primary login-submit" type="submit" disabled={loggingIn}>
            {loggingIn ? "Connexion…" : "Se connecter"} <span aria-hidden="true">→</span>
          </button>

          <p className="login-demo-note">
            Première connexion ? Utilise le mot de passe temporaire qui t’a été transmis.
            Tu choisiras ensuite ton propre mot de passe.
          </p>
        </form>
      </section>
    </main>
  );
}
