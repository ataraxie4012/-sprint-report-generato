import { useState } from "react";
import type { FormEvent } from "react";
import App from "./App";
import webwagLogo from "./webwag.svg";
import "./Login.css";

export default function Login() {
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState("");

  const openDemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmail("");
    setConnected(true);
  };

  if (connected) return <App onSignOut={() => setConnected(false)} />;

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
        <form className="login-form" onSubmit={openDemo} noValidate>
          <div className="login-form-heading">
            <h2 id="login-title">Bienvenue sur Sprintly</h2>
            <p>Accède à ton espace Webwag.</p>
          </div>

          <div className="login-field">
            <label htmlFor="login-email">Adresse e-mail Webwag (facultatif)</label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="prenom.nom@webwag.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <button className="button button-primary login-submit" type="submit">
            Accéder à Sprintly <span aria-hidden="true">→</span>
          </button>

          <p className="login-demo-note">
            Version de démonstration. Aucun identifiant n’est nécessaire. Tes rapports
            sont enregistrés dans ce navigateur. La connexion à un compte
            sera disponible une fois l’authentification configurée.
          </p>
        </form>
      </section>
    </main>
  );
}
