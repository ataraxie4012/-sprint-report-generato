import { canOpenBothWorkspaces, workspaceForEmail } from "./accessRoutes";
import { profileNameForEmail } from "./userProfile";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import NavIcon from "./NavIcon";
import { defaultAccent, getThemeMode, setThemeMode, getAccent, getSavedColors, saveHexAccent, setAccent, subscribeAccent } from "./theme";
import "./ThemeSettings.css";

const presets = [
  { name: "Violet", color: "#6258e8" },
  { name: "Bleu", color: "#2563eb" },
  { name: "Vert", color: "#16816a" },
  { name: "Rose", color: "#be3579" },
  { name: "Orange", color: "#b95616" },
];

export default function ThemeSettings({ email }: { email: string }) {
  const [section, setSection] = useState<"account" | "appearance">("account");
  const accountEmail = email.trim().toLowerCase();
  const hasSprint = !accountEmail || workspaceForEmail(accountEmail) === "sprint";
  const hasDocuments = !!accountEmail && (
    workspaceForEmail(accountEmail) === "documents" || canOpenBothWorkspaces(accountEmail)
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const inputId = useId();
  const accent = useSyncExternalStore(subscribeAccent, getAccent);
  const savedColors = useSyncExternalStore(subscribeAccent, getSavedColors);
  const mode = useSyncExternalStore(subscribeAccent, getThemeMode);
  const hexId = useId();
  const errorId = useId();
  const [hex, setHex] = useState(accent.toUpperCase());
  const [hexError, setHexError] = useState("");
  const [status, setStatus] = useState("");
  const [colorPage, setColorPage] = useState(0);
  const lastColorPage = Math.max(0, Math.ceil(savedColors.length / 2) - 1);
  const currentColorPage = Math.min(colorPage, lastColorPage);

  useEffect(() => {
    setHex(accent.toUpperCase());
    setHexError("");
  }, [accent]);

  const applyHex = () => {
    let normalized = hex.trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(normalized)) {
      normalized = normalized.split("").map(char => char + char).join("");
    }
    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
      setHexError("Saisis 3 ou 6 caractères hexadécimaux, par exemple #2563EB.");
      return;
    }
    setHexError("");
    setHex("#" + normalized.toUpperCase());
    setStatus(saveHexAccent("#" + normalized.toLowerCase())
      ? "Couleur appliquée et ajoutée aux couleurs enregistrées."
      : "Couleur appliquée. L’enregistrement dans ce navigateur est indisponible.");
  };

  const chooseColor = (color: string) => {
    setStatus(setAccent(color)
      ? "Couleur enregistrée dans ce navigateur."
      : "Couleur appliquée. L’enregistrement dans ce navigateur est indisponible.");
  };

  return (
    <>
      <button type="button" className="nav-item" onClick={() => dialog.current?.showModal()}>
        <NavIcon name="settings" /> Paramètres
      </button>
      <dialog
        ref={dialog}
        className="theme-settings"
        aria-labelledby={titleId}
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left || event.clientX > bounds.right
            || event.clientY < bounds.top || event.clientY > bounds.bottom
          ) {
            event.currentTarget.close();
          }
        }}
      >
        <div className="theme-settings-header">
          <h2 id={titleId}>Paramètres</h2>
          <button className="button button-secondary" onClick={() => dialog.current?.close()}>
            Fermer
          </button>
        </div>
        <div className="settings-sections" aria-label="Sections des paramètres">
          <button type="button" aria-pressed={section === "account"}
            onClick={() => setSection("account")}>Mon compte</button>
          <button type="button" aria-pressed={section === "appearance"}
            onClick={() => setSection("appearance")}>Apparence</button>
        </div>
        {section === "account" ? (
          <section className="settings-account" aria-label="Mon compte">
            <div className="settings-account-heading">
              <div className="avatar">{profileNameForEmail(accountEmail).charAt(0)}</div>
              <h3>{profileNameForEmail(accountEmail)}</h3>
            </div>
            <dl>
              <div>
                <dt>Adresse e-mail</dt>
                <dd>{accountEmail || "Accès démo sans e-mail"}</dd>
              </div>
              <div>
                <dt>Accès aux espaces</dt>
                <dd className="settings-access-list">
                  {hasSprint && (
                    <span><NavIcon name="sprint" /> Rapport de sprint et historique</span>
                  )}
                  {hasDocuments && (
                    <span><NavIcon name="documents" /> Documents et anciens travaux</span>
                  )}
                </dd>
              </div>
            </dl>
            <p>Profil de démonstration basé sur l’e-mail saisi.</p>
          </section>
        ) : (
          <>
        <div className="theme-mode-setting">
          <div>
            <h3>Mode sombre</h3>
            <p>{mode === "dark" ? "Activé" : "Désactivé"}</p>
          </div>
          <button
            type="button"
            className="theme-mode-switch"
            role="switch"
            aria-checked={mode === "dark"}
            aria-label="Mode sombre"
            onClick={() => setStatus(setThemeMode(mode === "dark" ? "light" : "dark")
              ? "Apparence enregistrée."
              : "Apparence appliquée. L’enregistrement est indisponible.")}
          >
          </button>
        </div>
        <h3>Couleur de Sprintly</h3>
        <div className="theme-presets">
          {presets.map(preset => (
            <button key={preset.color} type="button"
              className="theme-preset"
              aria-label={preset.name}
              aria-pressed={accent === preset.color}
              onClick={() => chooseColor(preset.color)}>
              <span style={{ backgroundColor: preset.color }} aria-hidden="true" />
              {preset.name}
            </button>
          ))}
        </div>
        <form className="theme-hex-form" onSubmit={event => {
          event.preventDefault();
          applyHex();
        }} noValidate>
          <label htmlFor={hexId}>Couleur personnalisée (HEX)</label>
          <div className="theme-hex-controls">
            <input
              id={inputId}
              type="color"
              aria-label="Choisir une couleur personnalisée"
              value={accent}
              onChange={event => chooseColor(event.target.value)}
            />
            <input
              id={hexId}
              type="text"
              value={hex}
              placeholder="#6258E8"
              spellCheck={false}
              autoComplete="off"
              aria-invalid={!!hexError}
              aria-describedby={hexError ? errorId : undefined}
              onChange={event => {
                setHex(event.target.value);
                setHexError("");
              }}
            />
            <button type="submit" className="button button-primary">Appliquer</button>
          </div>
          {hexError && <p id={errorId} className="theme-hex-error" role="alert">{hexError}</p>}
        </form>
        {savedColors.length > 0 && (
          <section className="theme-saved-colors" aria-label="Couleurs enregistrées">
            <div className="theme-saved-heading">
              <h3>Couleurs enregistrées</h3>
              {lastColorPage > 0 && (
                <div className="theme-color-pagination">
                  <button type="button" aria-label="Couleurs précédentes"
                    disabled={currentColorPage === 0}
                    onClick={() => setColorPage(currentColorPage - 1)}>←</button>
                  <span>{currentColorPage + 1}/{lastColorPage + 1}</span>
                  <button type="button" aria-label="Couleurs suivantes"
                    disabled={currentColorPage === lastColorPage}
                    onClick={() => setColorPage(currentColorPage + 1)}>→</button>
                </div>
              )}
            </div>
            <div className="theme-presets">
              {savedColors.slice(currentColorPage * 2, currentColorPage * 2 + 2).map(color => (
                <button
                  key={color}
                  type="button"
                  className="theme-preset"
                  aria-label={`Appliquer ${color.toUpperCase()}`}
                  aria-pressed={accent.toLowerCase() === color}
                  onClick={() => chooseColor(color)}
                >
                  <span style={{ backgroundColor: color }} aria-hidden="true" />
                  {color.toUpperCase()}
                </button>
              ))}
            </div>
          </section>
        )}
        <button className="button button-secondary" onClick={() => chooseColor(defaultAccent)}>
          Rétablir le violet d’origine
        </button>
        <p className="theme-settings-status" role="status">{status}</p>
          </>
        )}
      </dialog>
    </>
  );
}
