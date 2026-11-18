import NavIcon from "./NavIcon";

export type SprintPage = "general" | "history";

export default function SprintNavigation({
  activePage,
  onNavigate,
}: {
  activePage?: SprintPage;
  onNavigate: (page: SprintPage) => void;
}) {
  return (
    <details className="sprint-nav-group" open={activePage ? true : undefined}>
      <summary className={`nav-item sprint-nav-toggle${activePage ? " active" : ""}`}>
        <NavIcon name="sprint" />
        Rapport de sprint
        <span className="sprint-nav-chevron" aria-hidden="true" />
      </summary>
      <div className="sprint-nav-children">
        <button
          type="button"
          className={`nav-item${activePage === "general" ? " active" : ""}`}
          aria-current={activePage === "general" ? "page" : undefined}
          onClick={() => onNavigate("general")}
        >
          <NavIcon name="sprint" /> Rapport actuel
        </button>
        <button
          type="button"
          className={`nav-item${activePage === "history" ? " active" : ""}`}
          aria-current={activePage === "history" ? "page" : undefined}
          onClick={() => onNavigate("history")}
        >
          <NavIcon name="history" /> Historique des sprints
        </button>
      </div>
    </details>
  );
}
