import ConfirmDialog from "./ConfirmDialog";
import ProjectDirectory from "./ProjectDirectory";
import { projectRequest } from "./projects";
import type { ProjectSummary } from "./projects";
import "./Projects.css";
import MobileNavigation from "./MobileNavigation";
import ThemeSettings from "./ThemeSettings";
import { deleteDocumentHistoryItem, documentHistoryKey, readDocumentHistory, saveDocumentHistoryItem } from "./documentHistory";
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
  const [view, setView] = useState<"projects" | "editor" | "history">("projects");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const currentProjectId = useRef(projectId);
  currentProjectId.current = projectId;
  const activeProject = projects.find(project => project.id === projectId);
  const [savingDocument, setSavingDocument] = useState(false);

  const refreshProjects = async () => {
    setProjectsLoading(true);
    try {
      const result = await projectRequest();
      setProjects(result.projects);
      setProjectsError("");
    } catch (cause) {
      setProjectsError(cause instanceof Error ? cause.message : "Les projets sont indisponibles.");
    } finally { setProjectsLoading(false); }
  };

  useEffect(() => { void refreshProjects(); }, [email]);
  useEffect(() => {
    if (!projectsLoading && !projectsError && projectId
      && !projects.some(project => project.id === projectId && project.joined)) {
      setProjectId(null);
      setView("projects");
      setType("");
      setSavedDocumentId(null);
      setTitle("");
      setDate("");
      setDrafts({});
      setNotes("");
      generationRequest.current?.abort();
      generationRequest.current = null;
      setGenerating(false);
    }
  }, [projects, projectsLoading, projectsError, projectId]);

  const [history, setHistory] = useState<DocumentHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [historyMessage, setHistoryMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<{
    document: DocumentHistoryItem;
    projectId: string | null;
  } | null>(null);
  const [deletionError, setDeletionError] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "test" | "minutes">("all");
  const documentReturnPage = useRef<{
    view: "projects" | "editor" | "history";
    projectId: string | null;
    query: string;
    filter: "all" | "test" | "minutes";
  } | null>(null);

  const rememberDocumentOrigin = () => {
    documentReturnPage.current = {
      view, projectId, query: historyQuery, filter: historyFilter,
    };
  };


  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const records = projectId
          ? (await projectRequest("/" + projectId + "/documents")).documents
          : readDocumentHistory(email);
        if (!cancelled) {
          setHistory(records);
          setHistoryError("");
        }
      } catch (cause) {
        if (!cancelled) {
          setHistory([]);
          setHistoryError(cause instanceof Error ? cause.message : "L’historique est indisponible.");
        }
      }
    };
    setHistory([]);
    void refresh();
    const onStorage = (event: StorageEvent) => {
      if (!projectId && (event.key === documentHistoryKey(email) || event.key === null)) void refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, [email, projectId, view]);

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

  const saveDocument = async () => {
    if (!type || generating || savingDocument) return;
    const destinationProject = projectId;
    setSavingDocument(true);
    try {
      const id = savedDocumentId || (typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Date.now() + "-" + Math.random().toString(16).slice(2));
      const document: DocumentHistoryItem = {
        id,
        savedAt: new Date().toISOString(),
        type,
        title: title.trim() || documentTypes[type].title,
        date,
        fields: { ...drafts[type] },
        notes: type === "minutes" ? notes : "",
      };
      const records = destinationProject
        ? (await projectRequest("/" + destinationProject + "/documents", { document })).documents
        : saveDocumentHistoryItem(email, document);
      if (currentProjectId.current !== destinationProject) return;
      setHistory(records);
      if (destinationProject) {
        setProjects(previous => previous.map(project => project.id === destinationProject
          ? { ...project, documentCount: records.length } : project));
      }
      setSavedDocumentId(id);
      setHistoryError("");
      setStatus(savedDocumentId
        ? "Les modifications du document ont été enregistrées."
        : "Le document a été enregistré dans l’historique.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "L’enregistrement a échoué.");
    } finally { setSavingDocument(false); }
  };

  const selectProject = (
    project: ProjectSummary | null,
    nextView: "editor" | "history" = "history"
  ) => {
    if (projectId !== (project?.id || null)) {
      changeType("");
      setSavedDocumentId(null);
      setTitle("");
      setDate("");
      setDrafts({});
      setNotes("");
    }
    setHistoryMessage("");
    setProjectId(project?.id || null);
    setView(nextView);
    setNavigationOpen(false);
    setHistoryQuery("");
    setHistoryFilter("all");
  };

  const startNewDocument = () => {
    rememberDocumentOrigin();
    changeType("");
    setSavedDocumentId(null);
    setTitle("");
    setDate("");
    setDrafts({});
    setNotes("");
    setView("editor");
    window.scrollTo({ top: 0 });
  };

  const deleteDocument = async () => {
    if (!pendingDeletion || deletingId || savingDocument) return;
    const item = pendingDeletion.document;
    const destinationProject = pendingDeletion.projectId;
    setDeletionError("");
    setDeletingId(item.id);
    setHistoryError("");
    setHistoryMessage("");
    try {
      const records: DocumentHistoryItem[] = destinationProject
        ? (await projectRequest("/" + destinationProject + "/documents/delete", { id: item.id })).documents
        : deleteDocumentHistoryItem(email, item.id);
      if (currentProjectId.current !== destinationProject) return;
      setHistory(records);
      if (destinationProject) {
        setProjects(previous => previous.map(project => project.id === destinationProject
          ? { ...project, documentCount: records.length } : project));
      }
      if (savedDocumentId === item.id) setSavedDocumentId(null);
      setHistoryMessage("Le document a été supprimé.");
      setPendingDeletion(null);
    } catch (cause) {
      if (currentProjectId.current === destinationProject) {
        setDeletionError(cause instanceof Error ? cause.message : "La suppression a échoué.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const openSavedDocument = (item: DocumentHistoryItem) => {
    rememberDocumentOrigin();
    changeType(item.type);
    setSavedDocumentId(item.id);
    setTitle(item.title);
    setDate(item.date);
    setDrafts(previous => ({ ...previous, [item.type]: { ...item.fields } }));
    setNotes(item.notes);
    setView("editor");
    window.scrollTo({ top: 0 });
  };

  const returnFromDocument = () => {
    const previous = documentReturnPage.current;
    if (view !== "editor" || !previous) {
      setView("projects");
      return;
    }
    generationRequest.current?.abort();
    generationRequest.current = null;
    setGenerating(false);
    setGenerationError("");
    setProjectId(previous.projectId);
    setView(previous.view);
    setHistoryQuery(previous.query);
    setHistoryFilter(previous.filter);
    setNavigationOpen(false);
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

  const normalizedQuery = historyQuery.trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
  const filteredHistory = history.filter(item => {
    const searchableText = (item.title + " " + documentTypes[item.type].title)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
    return (historyFilter === "all" || item.type === historyFilter)
      && searchableText.includes(normalizedQuery);
  });
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
            Projets
            <span className="sprint-nav-chevron" aria-hidden="true" />
          </summary>
          <div className="sprint-nav-children">
            {projects.filter(project => project.joined)
              .sort((first, second) => first.name.localeCompare(second.name, "fr"))
              .map(project => (
                <button
                  type="button"
                  key={project.id}
                  className={`nav-item project-nav-item${projectId === project.id && view !== "projects" ? " active" : ""}`}
                  aria-current={projectId === project.id && view !== "projects" ? "page" : undefined}
                  onClick={() => selectProject(project)}
                >
                  <NavIcon name="documents" />
                  <span className="project-nav-name">{project.name}</span>
                </button>
              ))}
            <button
              type="button"
              className={`nav-item${view === "projects" ? " active" : ""}`}
              aria-current={view === "projects" ? "page" : undefined}
              onClick={() => setView("projects")}
            >
              <NavIcon name="settings" /> Gérer mes projets
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
      <div className="hub-content">
        {view === "projects" ? (
          <ProjectDirectory projects={projects} loading={projectsLoading} error={projectsError}
            onRefresh={refreshProjects} onOpen={selectProject} />
        ) : (
          <>
            <div className="project-context">
              <button type="button" className="button button-quiet" onClick={returnFromDocument}>
                {view === "editor" ? "← Retour" : "← Projets"}
              </button>
              <span>/</span>
              <strong>{activeProject?.name || "Projets"}</strong>
              {view === "editor" && template && (
                <><span>/</span><span>{template.title}</span></>
              )}
              {view === "editor" && (
                <div className="project-context-actions">
                  <button type="button" className="button button-secondary"
                    onClick={() => setView("history")}>Voir les documents</button>
                </div>
              )}
            </div>
        {view === "history" ? (
          <section className="hub-choice document-history" aria-labelledby="document-history-title">
            <div className="project-documents-heading">
              <h1 id="document-history-title">{activeProject?.name || "Documents"}</h1>
              {projectId && (
                <button type="button" className="button button-primary" onClick={startNewDocument}>
                  Créer un nouveau document
                </button>
              )}
            </div>
            <p>
              {projectId
                ? "Rapports de test et comptes rendus partagés dans ce projet."
                : "Tes anciens documents conservés dans ce navigateur, avant leur classement dans un projet."}
            </p>
            {historyError && <p role="alert">{historyError}</p>}
            {historyMessage && <p className="document-history-message" role="status">{historyMessage}</p>}
            {history.length > 0 && (
              <div className="document-history-toolbar">
                <div className="document-history-search">
                  <label htmlFor="document-history-search">Rechercher un document</label>
                  <input id="document-history-search" type="search"
                    placeholder="Titre ou type de document…"
                    value={historyQuery}
                    onChange={event => setHistoryQuery(event.target.value)} />
                </div>
                <div className="document-history-filters" role="group" aria-label="Filtrer par type de document">
                  {([
                    ["all", "Tous"],
                    ["test", "Tests"],
                    ["minutes", "Comptes rendus"],
                  ] as const).map(([value, label]) => (
                    <button type="button" key={value}
                      aria-pressed={historyFilter === value}
                      onClick={() => setHistoryFilter(value)}>
                      {label}
                    </button>
                  ))}
                </div>
                <span className="document-history-result-count" role="status">
                  {filteredHistory.length} document{filteredHistory.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
            {history.length === 0 ? (
              <div className="document-history-empty">
                <h2>Aucun document enregistré</h2>
                <p>Crée un rapport de test ou un compte rendu pour commencer.</p>
                <button className="button button-secondary" onClick={startNewDocument}>
                  Créer un nouveau document
                </button>
              </div>
            ) : (
              <div className="document-history-list">
                {filteredHistory.length === 0 && (
                  <div className="document-history-empty">
                    <h2>Aucun document trouvé</h2>
                    <p>Essaie un autre titre ou un autre type de document.</p>
                    <button className="button button-secondary" onClick={() => {
                      setHistoryQuery("");
                      setHistoryFilter("all");
                    }}>Réinitialiser les filtres</button>
                  </div>
                )}
                {filteredHistory.map(item => (
                  <article className="document-history-card" key={item.id}>
                    <div className="document-history-summary">
                      <div className="document-type-icon" data-type={item.type} aria-hidden="true">
                        <NavIcon name={item.type} />
                      </div>
                      <div className="document-history-text">
                      <h2>{item.title}</h2>
                      <div className="document-history-details">
                        <span className="document-history-kind" data-type={item.type}>
                          {documentTypes[item.type].title}
                        </span>
                        <time dateTime={item.savedAt}>
                          Enregistré le {new Date(item.savedAt).toLocaleString("fr-FR", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </time>
                        {item.date && (
                          <span>Document du {new Date(item.date + "T12:00:00").toLocaleDateString("fr-FR")}</span>
                        )}
                      </div>
                      </div>
                    </div>
                    <div className="document-history-actions">
                      <button type="button" className="button button-secondary"
                        disabled={!!deletingId} onClick={() => openSavedDocument(item)}>
                        <NavIcon name="view" /> Consulter
                      </button>
                      <button type="button" className="button document-delete-button"
                        disabled={!!deletingId || savingDocument}
                        onClick={() => {
                          setDeletionError("");
                          setPendingDeletion({ document: item, projectId });
                        }}>
                        <NavIcon name="trash" />
                        {deletingId === item.id ? "Suppression…" : "Supprimer"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
        <section className="hub-choice" aria-labelledby="hub-title">
          <h1 id="hub-title">{activeProject?.name || "Documents"}</h1>

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
                <button className="button button-primary" onClick={saveDocument} disabled={generating || savingDocument}>
                  {savingDocument ? "Enregistrement…" : savedDocumentId ? "Enregistrer les modifications" : "Enregistrer le document"}
                </button>
                <button className="button button-secondary" onClick={copyDocument}>Copier</button>
                <button className="button button-quiet" onClick={downloadDocument}>Télécharger le HTML</button>
              </div>
              <p role="status">{status}</p>
            </div>
          </section>
        )}
          </>
        )}
          </>
        )}
      </div>
      </main>
      <ConfirmDialog
        open={!!pendingDeletion}
        title="Supprimer ce document ?"
        description={pendingDeletion
          ? `« ${pendingDeletion.document.title} » sera supprimé définitivement.${pendingDeletion.projectId ? " Il sera retiré pour tous les membres du projet." : ""}`
          : ""}
        busy={!!deletingId}
        error={deletionError}
        onCancel={() => setPendingDeletion(null)}
        onConfirm={deleteDocument}
      />
    </div>
  );
}
