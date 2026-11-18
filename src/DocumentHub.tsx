import SprintNavigation from "./SprintNavigation";
import type { SprintPage } from "./SprintNavigation";
import { profileNameForEmail } from "./userProfile";
import NavIcon from "./NavIcon";
import { useEffect, useRef, useState } from "react";
import webwagLogo from "./webwag.svg";
import "./DocumentHub.css";
import { documentHtml } from "./documentExport";

const testDeviceFields = [
  { key: "device", label: "Device de test", placeholder: "Ex. téléphone, tablette…" },
  { key: "version", label: "Version testée", placeholder: "Ex. 7.39.0" },
  { key: "model", label: "Modèle du device", placeholder: "Ex. iPhone 15, Samsung Galaxy S24…" },
];

const documentTypes = {
  test: {
    title: "Rapport de test",
    fields: ["Périmètre et environnement", "Tests réalisés et résultats", "Anomalies et blocages", "Conclusion"],
  },
  minutes: {
    title: "Compte rendu",
    fields: ["Synthèse", "Participants", "Sujets abordés", "Décisions prises", "Actions et responsables", "Points à confirmer"],
  },
};
type DocumentType = "" | keyof typeof documentTypes;

export default function DocumentHub({
  email,
  onSignOut,
  onOpenSprint,
}: {
  email: string;
  onSignOut: () => void;
  onOpenSprint?: (page: SprintPage) => void;
}) {
  const [type, setType] = useState<DocumentType>("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [status, setStatus] = useState("");

  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const generationRequest = useRef<AbortController | null>(null);

  useEffect(() => () => generationRequest.current?.abort(), []);

  const generateMinutes = async () => {
    if (!notes.trim() || generationRequest.current) return;
    const controller = new AbortController();
    generationRequest.current = controller;
    setGenerating(true);
    setGenerationError("");
    setStatus("");
    try {
      const response = await fetch("/api/generate-minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, title, date }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "La génération a échoué.");
      if (!result.sections || !documentTypes.minutes.fields.every(
        field => typeof result.sections[field] === "string"
      )) throw new Error("Le compte rendu reçu est invalide. Réessaie.");
      setDrafts(previous => ({ ...previous, minutes: result.sections }));
      setStatus("Compte rendu généré. Relis et ajuste le texte avant de le partager.");
    } catch (error) {
      if (!controller.signal.aborted) {
        setGenerationError(error instanceof Error ? error.message : "La génération a échoué.");
      }
    } finally {
      if (generationRequest.current === controller) {
        generationRequest.current = null;
        setGenerating(false);
      }
    }
  };

  const changeType = (nextType: DocumentType) => {
    generationRequest.current?.abort();
    generationRequest.current = null;
    setGenerating(false);
    setGenerationError("");
    setType(nextType);
    setStatus("");
  };

  const template = type === "test" || type === "minutes" ? documentTypes[type] : null;
  const sectionFields = template?.fields.filter(
    field => type !== "minutes" || field !== "Participants"
  ) || [];
  const content = template
    ? [
        title.trim() || template.title,
        date ? new Date(date + "T12:00:00").toLocaleDateString("fr-FR") : "",
        ...(type === "minutes" ? ["Participants", drafts.minutes?.Participants || "—"] : []),
        ...(type === "test"
          ? testDeviceFields.map(({ key, label }) =>
              `${label} : ${drafts.test?.[key]?.trim() || "—"}`
            )
          : []),
        ...sectionFields.flatMap((field) => [field, drafts[type]?.[field] || "—"]),
      ].filter(Boolean).join("\n\n")
    : "";

  const htmlContent = template ? documentHtml({
    title: title.trim() || template.title,
    kind: template.title,
    date,
    participants: type === "minutes" ? drafts.minutes?.Participants || "—" : undefined,
    metadata: type === "test"
      ? testDeviceFields.map(({ key, label }) => ({
          label, value: drafts.test?.[key]?.trim() || "—",
        }))
      : [],
    sections: sectionFields.map(field => ({
      title: field, text: drafts[type]?.[field] || "—",
    })),
  }) : "";

  const copyDocument = async () => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([htmlContent], { type: "text/html" }),
          "text/plain": new Blob([content], { type: "text/plain" }),
        }),
      ]);
      setStatus("Document copié avec succès.");
    } catch {
      setStatus("La copie mise en forme est indisponible. Télécharge le document HTML.");
    }
  };

  const downloadDocument = () => {
    const url = URL.createObjectURL(new Blob([htmlContent], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = (title.trim() || template?.title || "document").replace(/[^\p{L}\p{N} _-]/gu, "") + ".html";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Document téléchargé.");
  };

  const profileName = profileNameForEmail(email);

  return (
    <div className="app document-hub">
      <aside className="sidebar" aria-label="Navigation principale">
        <div className="brand">
          <img className="webwag-logo" src={webwagLogo} alt="Webwag" width={48} height={43} />
          <div className="brand-name">
            <strong>Sprintly</strong>
            <span>GESTION DES SPRINTS</span>
          </div>
        </div>

        <div className="sidebar-label">ESPACE DE TRAVAIL</div>
        {onOpenSprint && (
          <SprintNavigation onNavigate={onOpenSprint} />
        )}
        <button
          type="button"
          className="nav-item active"
          aria-current="page"
          onClick={() => changeType("")}
        >
          <NavIcon name="documents" /> Documents
        </button>

        <div className="sidebar-bottom">
          <div className="hub-profile">
            <div className="avatar">{profileName.charAt(0)}</div>
            <div>
              <div className="hub-profile-name">{profileName}</div>
              <div className="hub-profile-caption">Espace de travail</div>
            </div>
          </div>
          <button
            type="button"
            className="button button-secondary sidebar-sign-out"
            onClick={onSignOut}
          >
            Retour à la connexion
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Espace de travail / <strong>Documents</strong>
            {template && <> / <strong>{template.title}</strong></>}
          </div>
        </header>
      <div className="hub-content">
        <section className="hub-choice" aria-labelledby="hub-title">
          <h1 id="hub-title">Quel document veux-tu préparer ?</h1>
          <p>Choisis le format adapté à ton travail.</p>
          <div>
            <label htmlFor="document-type">Type de document</label>
            <div className="hub-choice-controls">
              <select
                id="document-type"
                value={type}
                onChange={(event) => changeType(event.target.value as DocumentType)}
                required
              >
                <option value="">Choisir un document</option>
                <option value="test">Rapport de test</option>
                <option value="minutes">Compte rendu</option>
              </select>
            </div>
          </div>
        </section>

        {template && (
          <section className="hub-editor" aria-label={template.title}>
            <div className="hub-fields">
              <h2>{template.title}</h2>
              <div className="field">
                <label htmlFor="document-title">Titre</label>
                <input id="document-title" disabled={generating} value={title} placeholder={template.title}
                  onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="document-date">Date</label>
                <input id="document-date" type="date" disabled={generating} value={date}
                  onChange={(event) => setDate(event.target.value)} />
              </div>
              {type === "minutes" && (
                <div className="field">
                  <label htmlFor="meeting-participants">Participants</label>
                  <textarea
                    id="meeting-participants"
                    rows={2}
                    disabled={generating}
                    value={drafts.minutes?.Participants || ""}
                    onChange={event => setDrafts(previous => ({
                      ...previous,
                      minutes: { ...previous.minutes, Participants: event.target.value },
                    }))}
                  />
                </div>
              )}
              {type === "test" && (
                <fieldset className="test-device-fields">
                  <legend>Configuration de test</legend>
                  <div className="test-device-grid">
                    {testDeviceFields.map(({ key, label, placeholder }) => (
                      <div className="field" key={key}>
                        <label htmlFor={`test-${key}`}>{label}</label>
                        <input
                          id={`test-${key}`}
                          value={drafts.test?.[key] || ""}
                          placeholder={placeholder}
                          onChange={event => setDrafts(previous => ({
                            ...previous,
                            test: { ...previous.test, [key]: event.target.value },
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>
              )}
              {type === "minutes" && (
                <div className="minutes-ai">
                  <label htmlFor="meeting-notes">Colle tes notes de réunion</label>
                  <textarea
                    id="meeting-notes"
                    rows={7}
                    maxLength={20000}
                    value={notes}
                    disabled={generating}
                    onChange={event => setNotes(event.target.value)}
                    placeholder="Participants, échanges, décisions, actions à suivre…"
                    aria-describedby="minutes-ai-help"
                  />
                  <p id="minutes-ai-help">
                    Tes notes seront envoyées à OpenAI pour rédiger le compte rendu.
                    Le résultat remplira les sections ci-dessous et restera modifiable.
                  </p>
                  <button
                    className="button button-primary"
                    disabled={generating || !notes.trim()}
                    onClick={generateMinutes}
                  >
                    {generating ? "Génération en cours…" : "Générer le compte rendu avec l’IA"}
                  </button>
                  {generationError && <p className="minutes-ai-error" role="alert">{generationError}</p>}
                </div>
              )}
              <fieldset className="hub-document-sections" disabled={generating}>
              {sectionFields.map((field, index) => (
                <div className="field" key={field}>
                  <label htmlFor={"document-field-" + index}>{field}</label>
                  <textarea id={"document-field-" + index} rows={3}
                    value={drafts[type]?.[field] || ""}
                    onChange={(event) => setDrafts((previous) => ({
                      ...previous,
                      [type]: { ...previous[type], [field]: event.target.value },
                    }))} />
                </div>
              ))}
              </fieldset>
            </div>
            <div className="hub-preview" aria-busy={generating}>
              <h2>Aperçu du document</h2>
              <iframe
                className="hub-html-preview"
                title="Aperçu du document exporté"
                srcDoc={htmlContent}
                sandbox=""
              />
              <div className="hub-preview-actions">
                <button className="button button-primary" onClick={copyDocument}>Copier</button>
                <button className="button button-secondary" onClick={downloadDocument}>Télécharger le HTML</button>
              </div>
              <p role="status">{status}</p>
            </div>
          </section>
        )}
      </div>
      </main>
    </div>
  );
}
