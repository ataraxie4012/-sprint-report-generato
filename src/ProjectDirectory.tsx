import ConfirmDialog from "./ConfirmDialog";
import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { ProjectSummary } from "./projects";
import { projectRequest } from "./projects";
import NavIcon from "./NavIcon";

export default function ProjectDirectory({
  projects, loading, error, onRefresh, onOpen,
}: {
  projects: ProjectSummary[];
  loading: boolean;
  error: string;
  onRefresh: () => Promise<void>;
  onOpen: (project: ProjectSummary) => void;
}) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [creationError, setCreationError] = useState("");
  const [pendingDeletion, setPendingDeletion] = useState<ProjectSummary | null>(null);
  const [deletionError, setDeletionError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const nameId = useId();
  const searchId = useId();

  const normalizedQuery = query.trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
  const visibleProjects = projects.filter(project =>
    project.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr-FR").includes(normalizedQuery)
  ).sort((first, second) => first.name.localeCompare(second.name, "fr"));
  const groups = [
    { title: "Mes projets", projects: visibleProjects.filter(project => project.joined) },
    { title: "Autres projets", projects: visibleProjects.filter(project => !project.joined) },
  ];

  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setCreationError("");
    setMessage("");
    try {
      await projectRequest("", { name });
      setName("");
      setQuery("");
      await onRefresh();
      dialog.current?.close();
      setMessage("Projet créé et ajouté à Mes projets.");
    } catch (cause) {
      setCreationError(cause instanceof Error ? cause.message : "Création impossible.");
    } finally { setBusy(false); }
  };

  const chooseMembership = async (project: ProjectSummary, joined: boolean) => {
    if (busy) return;
    setBusy(true);
    setActionError("");
    setMessage("");
    try {
      await projectRequest("/" + project.id + "/membership", { joined });
      await onRefresh();
      setMessage(joined ? "Tu as rejoint " + project.name + "." : "Tu as quitté " + project.name + ".");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Modification impossible.");
    } finally { setBusy(false); }
  };

  const deleteProject = async () => {
    if (!pendingDeletion || busy) return;
    setBusy(true);
    setDeletionError("");
    try {
      await projectRequest("/" + pendingDeletion.id + "/delete", {});
      setPendingDeletion(null);
      await onRefresh();
      setMessage("Le projet et ses documents ont été supprimés.");
    } catch (cause) {
      setDeletionError(cause instanceof Error ? cause.message : "La suppression a échoué.");
    } finally { setBusy(false); }
  };

  return (
    <section className="project-directory">
      <div className="project-management-heading">
        <div className="project-directory-heading">
          <h1>Gérer mes projets</h1>
          <p>Choisis les projets à afficher dans ta navigation.</p>
        </div>
        <button type="button" className="button button-primary" disabled={busy}
          onClick={() => {
            setCreationError("");
            dialog.current?.showModal();
            nameInput.current?.focus();
          }}>
          Nouveau projet
        </button>
      </div>

      <div className="project-search">
        <label htmlFor={searchId}>Rechercher un projet</label>
        <input id={searchId} type="search" value={query} placeholder="Nom du projet…"
          onChange={event => setQuery(event.target.value)} />
      </div>

      {(error || actionError) && <p className="project-error" role="alert">{actionError || error}</p>}
      <p className="project-status" role="status">{loading ? "Chargement des projets…" : message}</p>
      {!loading && !error && projects.length === 0 && (
        <div className="document-history-empty">
          <h2>Aucun projet pour le moment</h2>
          <p>Crée ton premier projet avec le bouton « Nouveau projet ».</p>
        </div>
      )}
      {!loading && !error && projects.length > 0 && visibleProjects.length === 0 && (
        <div className="document-history-empty">
          <h2>Aucun projet trouvé</h2>
          <p>Essaie un autre nom.</p>
          <button type="button" className="button button-secondary" onClick={() => setQuery("")}>
            Effacer la recherche
          </button>
        </div>
      )}

      {groups.map(group => group.projects.length > 0 && (
        <section className="project-group" key={group.title} aria-label={group.title}>
          <div className="project-group-heading">
            <h2>{group.title}</h2>
            <span>{group.projects.length}</span>
          </div>
          <div className="project-grid">
            {group.projects.map(project => (
              <article className="project-folder" key={project.id}>
                <div className="project-folder-title">
                  <NavIcon name="documents" />
                  <h3>{project.name}</h3>
                  {project.canDelete && (
                    <button
                      type="button"
                      className="project-delete-trigger"
                      disabled={busy}
                      aria-label={`Supprimer le projet ${project.name}`}
                      title="Supprimer le projet"
                      onClick={() => {
                        setDeletionError("");
                        setPendingDeletion(project);
                      }}
                    >
                      <NavIcon name="trash" />
                    </button>
                  )}
                </div>
                <label className="project-membership"
                  title={project.joined ? "Décoche pour quitter ce projet" : "Coche pour rejoindre ce projet"}>
                  <input type="checkbox" checked={project.joined} disabled={busy}
                    onChange={event => chooseMembership(project, event.target.checked)} />
                  {project.joined ? "Projet rejoint" : "Rejoindre ce projet"}
                </label>
                {project.joined && (
                  <div className="project-folder-footer">
                    <span>
                      {project.documentCount || 0} document{project.documentCount === 1 ? "" : "s"}
                    </span>
                    <button type="button" className="button button-secondary"
                      disabled={busy} onClick={() => onOpen(project)}>
                      Ouvrir
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}

      <ConfirmDialog
        open={!!pendingDeletion}
        title="Supprimer ce projet ?"
        description={pendingDeletion
          ? `Le projet « ${pendingDeletion.name} » et tous ses rapports de test et comptes rendus seront supprimés définitivement pour tous les membres.`
          : ""}
        busy={busy}
        error={deletionError}
        onCancel={() => setPendingDeletion(null)}
        onConfirm={deleteProject}
      />

      <dialog ref={dialog} className="project-create-dialog" aria-labelledby={titleId}
        onCancel={event => {
          if (busy) event.preventDefault();
        }}
        onClick={event => {
          if (busy || event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right
            || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current?.close();
        }}>
        <form onSubmit={createProject}>
          <h2 id={titleId}>Nouveau projet</h2>
          <p>Tu rejoindras automatiquement le projet créé.</p>
          <div className="field">
            <label htmlFor={nameId}>Nom du projet</label>
            <input ref={nameInput} id={nameId} value={name} required maxLength={100}
              placeholder="Ex. Cheops" disabled={busy}
              onChange={event => setName(event.target.value)} />
          </div>
          {creationError && <p className="project-error" role="alert">{creationError}</p>}
          <div className="project-create-actions">
            <button type="button" className="button button-secondary" disabled={busy}
              onClick={() => dialog.current?.close()}>Annuler</button>
            <button type="submit" className="button button-primary" disabled={busy || !name.trim()}>
              {busy ? "Création…" : "Créer le projet"}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
