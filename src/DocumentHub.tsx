import MobileNavigation from "./MobileNavigation";
import ThemeSettings from "./ThemeSettings";
import { documentHistoryKey, readDocumentHistory, saveDocumentHistoryItem } from "./documentHistory";
import type { DocumentHistoryItem } from "./documentHistory";
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
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [view, setView] = useState<"editor" | "history">("editor");
  const [history, setHistory] = useState<DocumentHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    const refresh = () => {
      try {
        setHistory(readDocumentHistory(email));
        setHistoryError("");
      } catch {
        setHistoryError("L’historique ne peut pas être lu dans ce navigateur.");
      }
    };
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === documentHistoryKey(email) || event.key === null) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [email]);

  const [type, setType] = useState<DocumentType>("");
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
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
    if (nextType !== type) setSavedDocumentId(null);
    setType(nextType);
    setStatus("");
  };

  const saveDocument = () => {
    if (!type || generating) return;
    try {
      const id = savedDocumentId || (typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Date.now() + "-" + Math.random().toString(16).slice(2));
      const records = saveDocumentHistoryItem(email, {
        id,
        savedAt: new Date().toISOString(),
        type,
        title: title.trim() || documentTypes[type].title,
        date,
        fields: { ...drafts[type] },
        notes: type === "minutes" ? notes : "",
      });
      setHistory(records);
      setSavedDocumentId(id);
      setHistoryError("");
      setStatus(savedDocumentId
        ? "Les modifications du document ont été enregistrées."
        : "Le document a été enregistré dans l’historique.");
    } catch {
      setStatus("L’enregistrement a échoué. Télécharge le document pour le conserver.");
    }
  };

  const openSavedDocument = (item: DocumentHistoryItem) => {
    changeType(item.type);
    setSavedDocumentId(item.id);
    setTitle(item.title);
    setDate(item.date);
    setDrafts(previous => ({ ...previous, [item.type]: { ...item.fields } }));
    setNotes(item.notes);
    setView("editor");
    window.scrollTo({ top: 0 });
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
      <aside className="sidebar" aria-label="Navigation principale" data-mobile-open={navigationOpen}>
        <div className="brand">
          <img className="webwag-logo" src={webwagLogo} alt="Webwag" width={48} height={43} />
          <div className="brand-name">
            <strong>Sprintly</strong>
            <span>GESTION DES SPRINTS</span>
          </div>
          <MobileNavigation
            open={navigationOpen}
            controls="documents-sidebar-content"
            onToggle={() => setNavigationOpen(previous => !previous)}
          />
        </div>

        <div className="sidebar-content" id="documents-sidebar-content">
        <div className="sidebar-label">ESPACE DE TRAVAIL</div>
        {onOpenSprint && (
          <SprintNavigation onNavigate={onOpenSprint} />
        )}
        <details className="sprint-nav-group" open>
          <summary className="nav-item sprint-nav-toggle active">
            <NavIcon name="documents" />
            Documents
            <span className="sprint-nav-chevron" aria-hidden="true" />
          </summary>
          <div className="sprint-nav-children">
            <button
              type="button"
              className={`nav-item${view === "editor" ? " active" : ""}`}
              aria-current={view === "editor" ? "page" : undefined}
              onClick={() => setView("editor")}
            >
              <NavIcon name="documents" /> Préparer un document
            </button>
            <button
              type="button"
              className={`nav-item${view === "history" ? " active" : ""}`}
              aria-current={view === "history" ? "page" : undefined}
              onClick={() => setView("history")}
            >
              <NavIcon name="history" /> Anciens travaux
            </button>
          </div>
        </details>

        <div className="sidebar-bottom profile-card">
          <div className="profile-card-heading">
            <div className="avatar">{profileName.charAt(0)}</div>
            <div className="profile-card-identity">
              <strong>{profileName}</strong>
              <span>Espace de travail</span>
            </div>
          </div>
          <ThemeSettings email={email} />
          <button
            type="button"
            className="button button-secondary sidebar-sign-out"
            onClick={onSignOut}
          >
            <NavIcon name="logout" />
            <span>Déconnexion</span>
          </button>
        </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Espace de travail / <strong>Documents</strong>
            {view === "history"
              ? <> / <strong>Anciens travaux</strong></>
              : template && <> / <strong>{template.title}</strong></>}
          </div>
        </header>
      <div className="hub-content">
        {view === "history" ? (
          <section className="hub-choice document-history" aria-labelledby="document-history-title">
            <h1 id="document-history-title">Anciens travaux</h1>
            <p>
              Retrouve tes rapports de test et tes comptes rendus.
              Ils sont conservés dans ce navigateur pour ton adresse e-mail.
            </p>
            {historyError && <p role="alert">{historyError}</p>}
            {history.length === 0 ? (
              <div className="document-history-empty">
                <h2>Aucun document enregistré</h2>
                <p>Utilise « Enregistrer le document » depuis l’aperçu d’un document.</p>
                <button className="button button-secondary" onClick={() => setView("editor")}>
                  Préparer un document
                </button>
              </div>
            ) : (
              <div className="document-history-list">
                {history.map(item => (
                  <article className="document-history-card" key={item.id}>
                    <div>
                      <span className="document-history-kind" data-type={item.type}>
                        <NavIcon name={item.type} />
                        {documentTypes[item.type].title}
                      </span>
                      <h2>{item.title}</h2>
                      <p>
                        {item.date && <>Date du document {new Date(item.date + "T12:00:00").toLocaleDateString("fr-FR")} · </>}
                        Enregistré le {new Date(item.savedAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <button className="button button-secondary" onClick={() => openSavedDocument(item)}>
                      Ouvrir
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
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
                <button className="button button-secondary" onClick={saveDocument} disabled={generating}>
                  {savedDocumentId ? "Enregistrer les modifications" : "Enregistrer le document"}
                </button>
                <button className="button button-primary" onClick={copyDocument}>Copier</button>
                <button className="button button-secondary" onClick={downloadDocument}>Télécharger le HTML</button>
              </div>
              <p role="status">{status}</p>
            </div>
          </section>
        )}
          </>
        )}
      </div>
      </main>
    </div>
  );
}
