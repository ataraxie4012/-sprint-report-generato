import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import { authRequest } from "./auth";

export default function PasswordSettings({ email }: { email: string }) {
  const prefix = useId();
  const [loading, setLoading] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    authRequest("session").then(result => {
      if (cancelled) return;
      if (result.user?.email !== email) throw new Error("Reconnecte-toi pour gérer ton mot de passe.");
      setHasPassword(result.user.hasPassword);
    }).catch(cause => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Connexion indisponible.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [email]);

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setError("");
    setStatus("");
    if (password !== confirmation) {
      setError("Les deux mots de passe sont différents.");
      return;
    }
    setSaving(true);
    try {
      await authRequest("password", { password, currentPassword });
      setHasPassword(true);
      setCurrentPassword("");
      setPassword("");
      setConfirmation("");
      setStatus("Mot de passe enregistré pour " + email + ".");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="password-settings" onSubmit={savePassword}>
      <h3>{hasPassword ? "Modifier mon mot de passe" : "Définir mon mot de passe"}</h3>
      <p>Ce mot de passe sera demandé à la connexion pour {email}.</p>
      <fieldset disabled={loading || saving}>
        {hasPassword && (
          <div className="field">
            <label htmlFor={prefix + "-current"}>Mot de passe actuel</label>
            <input id={prefix + "-current"} type={visible ? "text" : "password"}
              autoComplete="current-password" value={currentPassword} required maxLength={128}
              onChange={event => setCurrentPassword(event.target.value)} />
          </div>
        )}
        <div className="field">
          <label htmlFor={prefix + "-new"}>Nouveau mot de passe</label>
          <input id={prefix + "-new"} type={visible ? "text" : "password"}
            autoComplete="new-password" value={password} minLength={10} maxLength={128} required
            onChange={event => setPassword(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={prefix + "-confirm"}>Confirmer le mot de passe</label>
          <input id={prefix + "-confirm"} type={visible ? "text" : "password"}
            autoComplete="new-password" value={confirmation} minLength={10} maxLength={128} required
            onChange={event => setConfirmation(event.target.value)} />
        </div>
        <label className="password-visibility">
          <input type="checkbox" checked={visible} onChange={event => setVisible(event.target.checked)} />
          Afficher les mots de passe
        </label>
        <span className="password-help">Entre 10 et 128 caractères.</span>
        <button className="button button-primary" type="submit">
          {saving ? "Enregistrement…" : "Enregistrer le mot de passe"}
        </button>
      </fieldset>
      {loading && <p role="status">Vérification du compte…</p>}
      {error && <p className="password-error" role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </form>
  );
}
