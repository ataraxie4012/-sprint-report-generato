import { useEffect, useState } from "react";
import "./App.css";

// ==========================================
// TYPES
// ==========================================

type Release = {
  version: string;
  date: string;
  name: string;
  description: string;
  link: string;
};

type Ticket = {
  key: string;
  title: string;
  points: number;
};

type Sprint = {
  name: string;
  startDate: string;
  endDate: string;
  objectives: string;
  plannedVelocity: number;
  actualVelocity: number;
  startTickets: number;
  startPoints: number;
  addedTickets: number;
  addedPoints: number;
  reestimatedTickets: number;
  reestimatedPoints: number;
  bugPoints: number;
  reportLink: string;
  signatories: string;
};

type SprintHistoryItem = {
  id: string;
  savedAt: string;
  sprint: Sprint;
  releases: Release[];
  tickets: Ticket[];
};

type SavedData = {
  sprint?: Partial<Sprint>;
  releases?: Release[];
  tickets?: Ticket[];
};

// ==========================================
// DONNÉES INITIALES
// ==========================================

const initialSprint: Sprint = {
  name: "Sprint 145",
  startDate: "2026-10-12",
  endDate: "2026-10-23",
  objectives: "VTO V2 & MYProduct bug fix\nContact Us x Chat",
  plannedVelocity: 48,
  actualVelocity: 61,
  startTickets: 41,
  startPoints: 29,
  addedTickets: 17,
  addedPoints: 26,
  reestimatedTickets: 10,
  reestimatedPoints: 25,
  bugPoints: 6,
  reportLink: "",
  signatories: "Manon, Victoria et Mathieu",
};

const initialReleases: Release[] = [
  {
    version: "7.38.0.29",
    date: "2026-10-16",
    name: "Fashion App",
    description: "Release Candidate",
    link: "",
  },
  {
    version: "7.39.0.19",
    date: "2026-10-23",
    name: "Fashion App",
    description: "November",
    link: "",
  },
];

const initialTickets: Ticket[] = [
  { key: "IT01ICCA-21771", title: "[VTO] V2 PDP", points: 3 },
  {
    key: "IT01ICCA-21041",
    title: "[GSSO APAC] Link account by email not verified",
    points: 3,
  },
  {
    key: "IT01ICCA-22103",
    title: "[ORT] Expand of the tab bar after typing a mail on the ORT section",
    points: 2,
  },
  {
    key: "IT01ICCA-22120",
    title: "Refactoring - Dynamic SafeAreaInsets",
    points: 3,
  },
  { key: "IT01ICCA-22149", title: "[Search] Keyboard opened in PLP", points: 1 },
];

// ==========================================
// UTILITAIRES
// ==========================================

const loadSavedData = (): SavedData => {
  try {
    const saved = localStorage.getItem("sprintly-data");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const loadSprintHistory = (): SprintHistoryItem[] => {
  try {
    const saved = localStorage.getItem("sprintly-history");
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatDate = (date: string) => {
  if (!date) return "";
  const parsedDate = new Date(`${date}T12:00:00`);
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const year = String(parsedDate.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

const formatLongDate = (date: string) => {
  if (!date) return "";
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const escapeHtml = (value: string | number) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const isValidLink = (link: string) => /^https?:\/\//i.test(link.trim());

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// ==========================================
// APPLICATION
// ==========================================

function App() {
  const [savedData] = useState<SavedData>(loadSavedData);

  const [sprint, setSprint] = useState<Sprint>(() => ({
    ...initialSprint,
    ...savedData.sprint,
  }));

  const [releases, setReleases] = useState<Release[]>(() =>
    Array.isArray(savedData.releases) ? savedData.releases : initialReleases
  );

  const [tickets, setTickets] = useState<Ticket[]>(() =>
    Array.isArray(savedData.tickets) ? savedData.tickets : initialTickets
  );

  const [history, setHistory] =
    useState<SprintHistoryItem[]>(loadSprintHistory);
  const [activeTab, setActiveTab] = useState<"general" | "history">("general");
  const [copied, setCopied] = useState(false);

  // ==========================================
  // SAUVEGARDE AUTOMATIQUE
  // ==========================================

  useEffect(() => {
    localStorage.setItem(
      "sprintly-data",
      JSON.stringify({ sprint, releases, tickets })
    );
  }, [sprint, releases, tickets]);

  useEffect(() => {
    localStorage.setItem("sprintly-history", JSON.stringify(history));
  }, [history]);

  // ==========================================
  // CALCULS
  // ==========================================

  const remainingPoints = tickets.reduce(
    (total, ticket) => total + Number(ticket.points || 0),
    0
  );

  const velocityPercentage =
    sprint.plannedVelocity > 0
      ? Math.round((sprint.actualVelocity / sprint.plannedVelocity) * 100)
      : 0;

  const initialPercentage =
    sprint.plannedVelocity > 0
      ? Math.round((sprint.startPoints / sprint.plannedVelocity) * 100)
      : 0;

  const addedPercentage =
    sprint.plannedVelocity > 0
      ? Math.round((sprint.addedPoints / sprint.plannedVelocity) * 100)
      : 0;

  const bugPercentage =
    sprint.actualVelocity > 0
      ? Math.round((sprint.bugPoints / sprint.actualVelocity) * 100)
      : 0;

  // ==========================================
  // MISE À JOUR DES DONNÉES
  // ==========================================

  const updateSprint = (field: keyof Sprint, value: string | number) => {
    setSprint((previous) => ({ ...previous, [field]: value }));
  };

  const updateRelease = (
    index: number,
    field: keyof Release,
    value: string
  ) => {
    setReleases((previous) =>
      previous.map((release, i) =>
        i === index ? { ...release, [field]: value } : release
      )
    );
  };

  const addRelease = () => {
    setReleases((previous) => [
      ...previous,
      { version: "", date: "", name: "", description: "", link: "" },
    ]);
  };

  const removeRelease = (index: number) => {
    setReleases((previous) => previous.filter((_, i) => i !== index));
  };

  const updateTicket = (
    index: number,
    field: keyof Ticket,
    value: string | number
  ) => {
    setTickets((previous) =>
      previous.map((ticket, i) =>
        i === index ? { ...ticket, [field]: value } : ticket
      )
    );
  };

  const addTicket = () => {
    setTickets((previous) => [
      ...previous,
      { key: "", title: "", points: 0 },
    ]);
  };

  const removeTicket = (index: number) => {
    setTickets((previous) => previous.filter((_, i) => i !== index));
  };

  // ==========================================
  // HISTORIQUE
  // ==========================================

  const saveSprintToHistory = () => {
    const newItem: SprintHistoryItem = {
      id: makeId(),
      savedAt: new Date().toISOString(),
      sprint: { ...sprint },
      releases: releases.map((release) => ({ ...release })),
      tickets: tickets.map((ticket) => ({ ...ticket })),
    };

    setHistory((previous) => [newItem, ...previous]);
    alert(`${sprint.name} a été enregistré dans l'historique.`);
  };

  const loadSprintFromHistory = (item: SprintHistoryItem) => {
    setSprint({ ...item.sprint });
    setReleases(item.releases.map((release) => ({ ...release })));
    setTickets(item.tickets.map((ticket) => ({ ...ticket })));
    setActiveTab("general");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteSprintFromHistory = (id: string) => {
    if (!window.confirm("Supprimer ce sprint de l'historique ?")) return;
    setHistory((previous) => previous.filter((item) => item.id !== id));
  };

  const duplicateSprintFromHistory = (item: SprintHistoryItem) => {
    setSprint({ ...item.sprint, name: `${item.sprint.name} (copie)` });
    setReleases(item.releases.map((release) => ({ ...release })));
    setTickets(item.tickets.map((ticket) => ({ ...ticket })));
    setActiveTab("general");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ==========================================
  // GÉNÉRATION DU RAPPORT HTML
  // ==========================================

  const generateReport = () => {
    const objectivesHtml = sprint.objectives
      .split("\n")
      .filter(Boolean)
      .map(
        (objective) => `
          <tr>
            <td style="padding:6px 0;font-size:13px;line-height:21px;color:#222;">
              <span style="color:#111;font-weight:bold;padding-right:9px;">—</span>
              ${escapeHtml(objective)}
            </td>
          </tr>`
      )
      .join("");

    const releaseHtml = releases.length
      ? releases
          .map(
            (release) => `
              <tr>
                <td style="padding:15px 12px;border-bottom:1px solid #e5e5e5;">
                  <strong style="color:#111;">${escapeHtml(
                    release.version || "Version à définir"
                  )}</strong>
                  <div style="font-size:11px;color:#777;margin-top:3px;">
                    ${escapeHtml(formatDate(release.date))}
                  </div>
                </td>
                <td style="padding:15px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;color:#222;">
                  ${escapeHtml(release.name)}
                  ${
                    release.description
                      ? `<div style="font-size:11px;color:#777;margin-top:3px;">${escapeHtml(
                          release.description
                        )}</div>`
                      : ""
                  }
                </td>
                <td align="right" style="padding:15px 12px;border-bottom:1px solid #e5e5e5;">
                  ${
                    isValidLink(release.link)
                      ? `<a href="${escapeHtml(
                          release.link
                        )}" style="color:#111;font-size:11px;text-decoration:underline;font-weight:bold;">Voir Jira →</a>`
                      : `<span style="color:#999;">—</span>`
                  }
                </td>
              </tr>`
          )
          .join("")
      : `<tr><td colspan="3" style="padding:18px;color:#777;">Aucune release renseignée.</td></tr>`;

    const ticketHtml = tickets.length
      ? tickets
          .map(
            (ticket) => `
              <tr>
                <td style="padding:12px;border-bottom:1px solid #e5e5e5;font-size:11px;color:#777;">
                  ${escapeHtml(ticket.key)}
                </td>
                <td style="padding:12px;border-bottom:1px solid #e5e5e5;font-size:13px;color:#222;">
                  ${escapeHtml(ticket.title)}
                </td>
                <td align="right" style="padding:12px;border-bottom:1px solid #e5e5e5;color:#111;font-weight:bold;">
                  ${escapeHtml(ticket.points)} pts
                </td>
              </tr>`
          )
          .join("")
      : `<tr><td colspan="3" style="padding:18px;color:#777;">Aucun ticket restant.</td></tr>`;

    const reportLinkHtml = isValidLink(sprint.reportLink)
      ? `
        <tr>
          <td style="padding:25px 32px;">
            <a href="${escapeHtml(
              sprint.reportLink
            )}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:13px 19px;font-size:12px;font-weight:bold;">
              Consulter le rapport complet →
            </a>
          </td>
        </tr>`
      : "";

    const progressWidth = Math.min(100, Math.max(0, velocityPercentage));

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(sprint.name)} - Rapport de sprint</title>
</head>
<body style="margin:0;padding:0;background:#f1f1f1;font-family:Arial,Helvetica,sans-serif;color:#171717;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f1f1;">
<tr><td align="center" style="padding:30px 12px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#fff;border-collapse:collapse;">

<tr><td style="background:#111;padding:36px 32px;">
<div style="font-size:11px;letter-spacing:3px;color:#aaa;margin-bottom:18px;">RAPPORT DE SPRINT</div>
<div style="font-size:30px;line-height:38px;font-weight:bold;color:#fff;">${escapeHtml(sprint.name)}</div>
<div style="font-size:12px;color:#ccc;margin-top:12px;">${escapeHtml(formatDate(sprint.startDate))} &nbsp; — &nbsp; ${escapeHtml(formatDate(sprint.endDate))}</div>
</td></tr>

<tr><td style="padding:30px 32px;font-size:13px;line-height:23px;color:#444;">
Bonjour à tous,<br><br>
Voici le récapitulatif du <strong>${escapeHtml(sprint.name)}</strong>,
qui s'est déroulé du ${escapeHtml(formatLongDate(sprint.startDate))}
au ${escapeHtml(formatLongDate(sprint.endDate))}.
</td></tr>

<tr><td style="padding:8px 32px 25px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border-left:4px solid #111;">
<tr><td style="padding:19px 20px;">
<div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#111;margin-bottom:12px;">OBJECTIFS DU SPRINT</div>
<table width="100%" cellpadding="0" cellspacing="0">${objectivesHtml}</table>
</td></tr></table>
</td></tr>

<tr><td style="padding:10px 32px 25px;">
<div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#777;margin-bottom:15px;">01 / RELEASES</div>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;">
<tr style="background:#111;color:#fff;">
<th width="30%" align="left" style="padding:12px;font-size:11px;color:#fff;">VERSION</th>
<th width="40%" align="left" style="padding:12px;font-size:11px;color:#fff;">APPLICATION</th>
<th width="30%" align="right" style="padding:12px;font-size:11px;color:#fff;">LIEN</th>
</tr>
${releaseHtml}
</table></td></tr>

<tr><td style="padding:15px 32px 25px;">
<div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#777;margin-bottom:15px;">02 / VÉLOCITÉ DU SPRINT</div>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;">
<tr>
<td width="32%" style="padding:17px 12px;background:#f1f1f1;">
<div style="font-size:11px;color:#666;font-weight:bold;">OBJECTIF</div>
<div style="font-size:27px;font-weight:bold;color:#111;margin-top:8px;">${sprint.plannedVelocity}</div>
<div style="font-size:11px;color:#777;">Points d'effort</div>
</td>
<td width="2%"></td>
<td width="32%" style="padding:17px 12px;background:#111;color:#fff;">
<div style="font-size:11px;color:#ccc;font-weight:bold;">RÉALISÉ</div>
<div style="font-size:27px;font-weight:bold;color:#fff;margin-top:8px;">${sprint.actualVelocity}</div>
<div style="font-size:11px;color:#ccc;">Points d'effort</div>
</td>
<td width="2%"></td>
<td width="32%" style="padding:17px 12px;background:#e5e5e5;">
<div style="font-size:11px;color:#555;font-weight:bold;">PERFORMANCE</div>
<div style="font-size:27px;font-weight:bold;color:#111;margin-top:8px;">${velocityPercentage}%</div>
<div style="font-size:11px;color:#777;">De l'objectif</div>
</td>
</tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:15px;background:#e5e5e5;">
<tr><td width="${progressWidth}%" height="7" style="background:#111;"></td><td></td></tr>
</table>
<div style="font-size:11px;color:#777;margin-top:7px;">${sprint.actualVelocity} points réalisés sur ${sprint.plannedVelocity} points prévus.</div>
</td></tr>

<tr><td style="padding:15px 32px 25px;">
<div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#777;margin-bottom:15px;">03 / DÉTAILS DU SPRINT</div>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr>
<td style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;color:#333;">Tickets au démarrage</td>
<td align="right" style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;font-weight:bold;color:#111;">${sprint.startTickets} tickets · ${sprint.startPoints} pts</td>
<td align="right" width="55" style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:11px;color:#777;">${initialPercentage}%</td>
</tr>
<tr>
<td style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;color:#333;">Tickets ajoutés</td>
<td align="right" style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;font-weight:bold;color:#111;">${sprint.addedTickets} tickets · ${sprint.addedPoints} pts</td>
<td align="right" width="55" style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:11px;color:#777;">${addedPercentage}%</td>
</tr>
<tr>
<td style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;color:#333;">Tickets réestimés</td>
<td colspan="2" align="right" style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;font-weight:bold;color:#111;">${sprint.reestimatedTickets} tickets · +${sprint.reestimatedPoints} pts</td>
</tr>
<tr>
<td style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;color:#333;">Effort consacré aux bugs</td>
<td colspan="2" align="right" style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;font-weight:bold;color:#111;">${sprint.bugPoints} pts · ${bugPercentage}%</td>
</tr>
</table></td></tr>

<tr><td style="padding:15px 32px 30px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f1f1;margin-bottom:17px;">
<tr><td style="padding:18px 20px;">
<div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#555;">04 / POINTS RESTANTS</div>
<div style="font-size:27px;font-weight:bold;color:#111;margin-top:5px;">${remainingPoints} pts</div>
<div style="font-size:11px;color:#777;">${tickets.length} tickets non terminés</div>
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;">
<tr style="background:#111;">
<th width="27%" align="left" style="padding:11px 9px;font-size:11px;color:#fff;">TICKET</th>
<th width="53%" align="left" style="padding:11px 9px;font-size:11px;color:#fff;">DESCRIPTION</th>
<th width="20%" align="right" style="padding:11px 9px;font-size:11px;color:#fff;">POINTS</th>
</tr>
${ticketHtml}
</table></td></tr>

${reportLinkHtml}

<tr><td style="padding:28px 32px;background:#111;color:#fff;">
<div style="font-size:13px;line-height:22px;color:#eee;">Bon week-end à tous,</div>
<div style="font-size:13px;font-weight:bold;color:#fff;margin-top:5px;">${escapeHtml(sprint.signatories)}</div>
<div style="font-size:11px;color:#999;margin-top:18px;letter-spacing:1px;">SPRINTLY · ${escapeHtml(sprint.name).toUpperCase()}</div>
</td></tr>

</table></td></tr></table>
</body>
</html>`;
  };

  // ==========================================
  // COPIE DU RAPPORT
  // ==========================================

  const copyReport = async () => {
    try {
      const html = generateReport();
      const plainText = `
Bonjour à tous,

Voici le récapitulatif du ${sprint.name}.

Objectifs :
${sprint.objectives}

Vélocité prévue : ${sprint.plannedVelocity} points
Vélocité réelle : ${sprint.actualVelocity} points
Tickets restants : ${remainingPoints} points

Bon week-end à tous,
${sprint.signatories}
      `.trim();

      const clipboardItem = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plainText], { type: "text/plain" }),
      });

      await navigator.clipboard.write([clipboardItem]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Erreur lors de la copie :", error);
      alert(
        "La copie HTML n'a pas fonctionné. Essaie de télécharger le rapport."
      );
    }
  };

  // ==========================================
  // TÉLÉCHARGEMENT HTML
  // ==========================================

  const downloadReport = () => {
    const html = generateReport();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${sprint.name.replace(/\s+/g, "-")}-rapport.html`;
    link.click();

    URL.revokeObjectURL(url);
  };

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <div className="app">
      {/* BARRE LATÉRALE */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <div className="brand-name">
            <strong>Sprintly</strong>
            <span>GESTION DES SPRINTS</span>
          </div>
        </div>

        <div className="sidebar-label">ESPACE DE TRAVAIL</div>

        <button
          type="button"
          className={`nav-item ${activeTab === "general" ? "active" : ""}`}
          onClick={() => setActiveTab("general")}
        >
          ◈ &nbsp; Rapport de sprint
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          ◷ &nbsp; Historique des sprints
        </button>

        <div className="sidebar-bottom">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar">M</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Manon</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>
                Espace de travail
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Espace de travail /{" "}
            <strong>
              {activeTab === "history" ? "Historique" : "Rapport de sprint"}
            </strong>
          </div>

          <div className="topbar-actions">
            <span className="saved-status">● Sauvegarde automatique</span>
            {activeTab === "general" && (
              <button
                type="button"
                className="button button-primary"
                onClick={saveSprintToHistory}
              >
                Enregistrer le rapport
              </button>
            )}
          </div>
        </header>

        <div className="content">
          {/* TITRE DE LA PAGE */}
          <div className="page-heading">
            <div className="eyebrow">GESTION DES SPRINTS</div>
            <h1>
              {activeTab === "history"
                ? "Historique des sprints"
                : "Rapport de sprint"}
            </h1>
            <p style={{ color: "#888888", fontSize: 13 }}>
              {activeTab === "history"
                ? "Retrouve, consulte ou duplique tes anciens rapports."
                : "Configure tes données et génère automatiquement ton rapport."}
            </p>
          </div>

          {/* ====================================== */}
          {/* PAGE HISTORIQUE                       */}
          {/* ====================================== */}

          {activeTab === "history" && (
            <section className="history-dashboard">
              {/* STATISTIQUES */}
              <div className="history-stats">
                <div className="history-stat-card">
                  <span className="history-stat-label">
                    Sprints enregistrés
                  </span>
                  <strong>{history.length}</strong>
                  <small>Historique total</small>
                </div>

                <div className="history-stat-card">
                  <span className="history-stat-label">
                    Vélocité moyenne
                  </span>
                  <strong>
                    {history.length
                      ? Math.round(
                          history.reduce(
                            (total, item) =>
                              total +
                              Number(item.sprint?.actualVelocity || 0),
                            0
                          ) / history.length
                        )
                      : 0}
                    <span> pts</span>
                  </strong>
                  <small>Sur tous les sprints</small>
                </div>

                <div className="history-stat-card">
                  <span className="history-stat-label">
                    Meilleure vélocité
                  </span>
                  <strong>
                    {history.length
                      ? Math.max(
                          ...history.map((item) =>
                            Number(item.sprint?.actualVelocity || 0)
                          )
                        )
                      : 0}
                    <span> pts</span>
                  </strong>
                  <small>Meilleur résultat enregistré</small>
                </div>

                <div className="history-stat-card">
                  <span className="history-stat-label">Dernier sprint</span>
                  <strong className="history-last-sprint">
                    {history.length ? history[0].sprint?.name : "—"}
                  </strong>
                  <small>
                    {history.length
                      ? formatDate(history[0].sprint?.startDate || "")
                      : "Aucun sprint"}
                  </small>
                </div>
              </div>

              {/* GRAPHIQUE DE VÉLOCITÉ */}
              <section className="velocity-dashboard">
                <div className="velocity-dashboard-header">
                  <div>
                    <h2>Comparaison des vélocités</h2>
                    <p>
                      Comparaison entre la vélocité prévue et réalisée.
                    </p>
                  </div>
                  <span className="velocity-period">
                    {Math.min(history.length, 8)} derniers sprints
                  </span>
                </div>

                {history.length === 0 ? (
                  <div className="velocity-empty">
                    Enregistre plusieurs sprints pour afficher leur comparaison.
                  </div>
                ) : (
                  <div className="velocity-chart">
                    <div className="velocity-chart-legend">
                      <span>
                        <i className="legend-real" />
                        Vélocité réalisée
                      </span>
                      <span>
                        <i className="legend-planned" />
                        Vélocité prévue
                      </span>
                    </div>

                    <div className="velocity-chart-grid">
                      {[100, 75, 50, 25, 0].map((value) => (
                        <div className="chart-grid-line" key={value}>
                          <span>{value}%</span>
                          <div />
                        </div>
                      ))}

                      <div className="velocity-bars">
                        {history
                          .slice(0, 8)
                          .reverse()
                          .map((item) => {
                            const planned = Number(
                              item.sprint?.plannedVelocity || 0
                            );
                            const actual = Number(
                              item.sprint?.actualVelocity || 0
                            );

                            const maxScale = Math.max(
                              ...history.slice(0, 8).map((entry) =>
                                Math.max(
                                  Number(
                                    entry.sprint?.plannedVelocity || 0
                                  ),
                                  Number(
                                    entry.sprint?.actualVelocity || 0
                                  )
                                )
                              ),
                              1
                            );

                            const plannedHeight = (planned / maxScale) * 100;
                            const actualHeight = (actual / maxScale) * 100;

                            return (
                              <div
                                className="velocity-bar-group"
                                key={item.id}
                              >
                                <div className="velocity-bar-container">
                                  <div
                                    className="velocity-bar planned-bar"
                                    style={{ height: `${plannedHeight}%` }}
                                    title={`Prévu : ${planned} points`}
                                  />
                                  <div
                                    className="velocity-bar actual-bar"
                                    style={{ height: `${actualHeight}%` }}
                                    title={`Réalisé : ${actual} points`}
                                  />
                                </div>
                                <span className="velocity-bar-label">
                                  {item.sprint?.name || "Sprint"}
                                </span>
                                <span className="velocity-bar-value">
                                  {actual} pts
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* LISTE DES SPRINTS */}
              <div className="history-content">
                <div className="history-header">
                  <div>
                    <h2>Historique des sprints</h2>
                    <p>
                      Consulte et retrouve l'ensemble de tes rapports
                      précédemment enregistrés.
                    </p>
                  </div>
                  <span className="step-badge">
                    {history.length} sprint(s)
                  </span>
                </div>

                {history.length === 0 ? (
                  <div className="history-empty">
                    <div className="history-empty-icon">◷</div>
                    <h3>Aucun sprint enregistré</h3>
                    <p>
                      Tes prochains rapports apparaîtront ici une fois
                      enregistrés.
                    </p>
                  </div>
                ) : (
                  <div className="history-list">
                    {history.map((item) => {
                      const planned = Number(
                        item.sprint?.plannedVelocity || 0
                      );
                      const actual = Number(
                        item.sprint?.actualVelocity || 0
                      );
                      const performance =
                        planned > 0
                          ? Math.round((actual / planned) * 100)
                          : 0;

                      const remaining = (item.tickets || []).reduce(
                        (total, ticket) =>
                          total + Number(ticket.points || 0),
                        0
                      );

                      const progress = Math.min(
                        100,
                        Math.max(0, performance)
                      );

                      return (
                        <article className="history-item" key={item.id}>
                          <div className="history-item-main">
                            <div className="history-item-title">
                              <div className="history-item-icon">◈</div>
                              <div>
                                <h3>{item.sprint.name}</h3>
                                <span>
                                  Enregistré le{" "}
                                  {new Date(item.savedAt).toLocaleDateString(
                                    "fr-FR",
                                    {
                                      day: "2-digit",
                                      month: "long",
                                      year: "numeric",
                                    }
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="history-item-date">
                              <span>PÉRIODE DU SPRINT</span>
                              <strong>
                                {formatDate(item.sprint.startDate)}
                                {" — "}
                                {formatDate(item.sprint.endDate)}
                              </strong>
                            </div>
                          </div>

                          <div className="history-item-metrics">
                            <div className="history-metric">
                              <span>Vélocité prévue</span>
                              <strong>
                                {planned}
                                <small> pts</small>
                              </strong>
                            </div>

                            <div className="history-metric">
                              <span>Vélocité réalisée</span>
                              <strong>
                                {actual}
                                <small> pts</small>
                              </strong>
                            </div>

                            <div className="history-metric">
                              <span>Points restants</span>
                              <strong>
                                {remaining}
                                <small> pts</small>
                              </strong>
                            </div>

                            <div className="history-metric">
                              <div className="history-progress-header">
                                <span>Performance</span>
                                <strong>{performance}%</strong>
                              </div>
                              <div className="history-progress-track">
                                <div
                                  className="history-progress-fill"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <small>
                                {performance >= 100
                                  ? "Objectif atteint"
                                  : "Progression par rapport à l'objectif"}
                              </small>
                            </div>
                          </div>

                          <div className="history-item-footer">
                            <div className="history-ticket-count">
                              {item.tickets?.length || 0} tickets restants
                              <span>·</span>
                              {item.releases?.length || 0} releases
                            </div>

                            <div className="history-actions">
                              <button
                                type="button"
                                className="button button-secondary"
                                onClick={() => loadSprintFromHistory(item)}
                              >
                                Consulter
                              </button>
                              <button
                                type="button"
                                className="button button-secondary"
                                onClick={() =>
                                  duplicateSprintFromHistory(item)
                                }
                              >
                                Dupliquer
                              </button>
                              <button
                                type="button"
                                className="history-delete-button"
                                onClick={() =>
                                  deleteSprintFromHistory(item.id)
                                }
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ====================================== */}
          {/* PAGE RAPPORT DE SPRINT                 */}
          {/* ====================================== */}

          {activeTab === "general" && (
            <>
              {/* KPI */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <div className="stat-label">Vélocité prévue</div>
                    <div className="kpi-icon purple">◎</div>
                  </div>
                  <div className="stat-value">
                    {sprint.plannedVelocity} <span>pts</span>
                  </div>
                  <div className="stat-footer">Objectif du sprint</div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <div className="stat-label">Vélocité réelle</div>
                    <div className="kpi-icon green">↗</div>
                  </div>
                  <div className="stat-value">
                    {sprint.actualVelocity} <span>pts</span>
                  </div>
                  <div className="stat-footer positive">
                    {velocityPercentage >= 100 ? "+" : ""}
                    {velocityPercentage - 100}% de l'objectif
                  </div>
                  <div className="velocity-progress">
                    <div
                      className="velocity-progress-fill complete"
                      style={{
                        width: `${Math.min(velocityPercentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <div className="stat-label">Points restants</div>
                    <div className="kpi-icon orange">◷</div>
                  </div>
                  <div className="stat-value">
                    {remainingPoints} <span>pts</span>
                  </div>
                  <div className="stat-footer">Tickets non terminés</div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <div className="stat-label">Effort bugs</div>
                    <div className="kpi-icon red">⚑</div>
                  </div>
                  <div className="stat-value">
                    {sprint.bugPoints} <span>pts</span>
                  </div>
                  <div className="stat-footer">
                    {bugPercentage}% de la vélocité réelle
                  </div>
                </div>
              </div>

              {/* ESPACE DE TRAVAIL */}
              <div className="workspace">
                {/* FORMULAIRE */}
                <section className="form-panel">
                  <div className="panel-header">
                    <h2>Configuration du rapport</h2>
                    <span className="step-badge">Édition</span>
                  </div>

                  {/* INFORMATIONS GÉNÉRALES */}
                  <div className="form-section">
                    <div className="section-heading">
                      01 — Informations générales
                    </div>

                    <div className="field">
                      <label>Nom du sprint</label>
                      <input
                        value={sprint.name}
                        onChange={(e) => updateSprint("name", e.target.value)}
                      />
                    </div>

                    <div className="field-row">
                      <div className="field">
                        <label>Date de début</label>
                        <input
                          type="date"
                          value={sprint.startDate}
                          onChange={(e) =>
                            updateSprint("startDate", e.target.value)
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Date de fin</label>
                        <input
                          type="date"
                          value={sprint.endDate}
                          onChange={(e) =>
                            updateSprint("endDate", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label>Objectifs du sprint</label>
                      <textarea
                        value={sprint.objectives}
                        onChange={(e) =>
                          updateSprint("objectives", e.target.value)
                        }
                        placeholder="Un objectif par ligne"
                      />
                    </div>
                  </div>

                  {/* INDICATEURS DE VÉLOCITÉ */}
                  <div className="form-section">
                    <div className="section-heading">
                      02 — Indicateurs de vélocité
                    </div>

                    <div className="field-row">
                      <div className="field">
                        <label>Vélocité prévue (points)</label>
                        <input
                          type="number"
                          value={sprint.plannedVelocity || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateSprint(
                              "plannedVelocity",
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Vélocité réelle (points)</label>
                        <input
                          type="number"
                          value={sprint.actualVelocity || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateSprint(
                              "actualVelocity",
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="field-row">
                      <div className="field">
                        <label>Tickets au démarrage</label>
                        <input
                          type="number"
                          value={sprint.startTickets || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateSprint("startTickets", Number(e.target.value))
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Points au démarrage</label>
                        <input
                          type="number"
                          value={sprint.startPoints || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateSprint("startPoints", Number(e.target.value))
                          }
                        />
                      </div>
                    </div>

                    <div className="field-row">
                      <div className="field">
                        <label>Tickets ajoutés</label>
                        <input
                          type="number"
                          value={sprint.addedTickets || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateSprint("addedTickets", Number(e.target.value))
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Points ajoutés</label>
                        <input
                          type="number"
                          value={sprint.addedPoints || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateSprint("addedPoints", Number(e.target.value))
                          }
                        />
                      </div>
                    </div>

                    <div className="field-row">
                      <div className="field">
                        <label>Tickets réestimés</label>
                        <input
                          type="number"
                          value={sprint.reestimatedTickets || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateSprint(
                              "reestimatedTickets",
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Points réestimés</label>
                        <input
                          type="number"
                          value={sprint.reestimatedPoints || ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateSprint(
                              "reestimatedPoints",
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label>Effort bugs (points)</label>
                      <input
                        type="number"
                        value={sprint.bugPoints || ""}
                          placeholder="0"
                        onChange={(e) =>
                          updateSprint("bugPoints", Number(e.target.value))
                        }
                      />
                    </div>
                  </div>

                  {/* RELEASES */}
                  <div className="form-section">
                    <div className="section-heading">03 — Releases</div>

                    {releases.map((release, index) => (
                      <div className="dynamic-card" key={index}>
                        <div className="dynamic-card-header">
                          <strong>Release {index + 1}</strong>
                          <button
                            type="button"
                            className="remove-button"
                            onClick={() => removeRelease(index)}
                          >
                            Supprimer
                          </button>
                        </div>

                        <div className="field-row">
                          <div className="field">
                            <label>Version</label>
                            <input
                              value={release.version}
                              onChange={(e) =>
                                updateRelease(index, "version", e.target.value)
                              }
                            />
                          </div>
                          <div className="field">
                            <label>Date</label>
                            <input
                              type="date"
                              value={release.date}
                              onChange={(e) =>
                                updateRelease(index, "date", e.target.value)
                              }
                            />
                          </div>
                        </div>

                        <div className="field">
                          <label>Application</label>
                          <input
                            value={release.name}
                            onChange={(e) =>
                              updateRelease(index, "name", e.target.value)
                            }
                          />
                        </div>

                        <div className="field">
                          <label>Description de la release</label>
                          <input
                            value={release.description}
                            onChange={(e) =>
                              updateRelease(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="field">
                          <label>Lien Jira</label>
                          <input
                            value={release.link}
                            onChange={(e) =>
                              updateRelease(index, "link", e.target.value)
                            }
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={addRelease}
                    >
                      + Ajouter une release
                    </button>
                  </div>

                  {/* TICKETS RESTANTS */}
                  <div className="form-section">
                    <div className="section-heading">
                      04 — Tickets restants
                    </div>

                    {tickets.map((ticket, index) => (
                      <div className="dynamic-card" key={index}>
                        <div className="dynamic-card-header">
                          <strong>Ticket {index + 1}</strong>
                          <button
                            type="button"
                            className="remove-button"
                            onClick={() => removeTicket(index)}
                          >
                            Supprimer
                          </button>
                        </div>

                        <div className="field">
                          <label>Clé Jira</label>
                          <input
                            value={ticket.key}
                            onChange={(e) =>
                              updateTicket(index, "key", e.target.value)
                            }
                          />
                        </div>

                        <div className="field">
                          <label>Description</label>
                          <input
                            value={ticket.title}
                            onChange={(e) =>
                              updateTicket(index, "title", e.target.value)
                            }
                          />
                        </div>

                        <div className="field">
                          <label>Points d'effort</label>
                          <input
                            type="number"
                            value={ticket.points || ""}
                            placeholder="0"
                            onChange={(e) =>
                              updateTicket(index, "points", Number(e.target.value))
                            }
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={addTicket}
                    >
                      + Ajouter un ticket
                    </button>
                  </div>

                  {/* FINALISATION */}
                  <div className="form-section">
                    <div className="section-heading">05 — Finalisation</div>

                    <div className="field">
                      <label>Lien vers le rapport complet</label>
                      <input
                        value={sprint.reportLink}
                        onChange={(e) =>
                          updateSprint("reportLink", e.target.value)
                        }
                        placeholder="https://..."
                      />
                    </div>

                    <div className="field">
                      <label>Signataires</label>
                      <input
                        value={sprint.signatories}
                        onChange={(e) =>
                          updateSprint("signatories", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </section>

                {/* APERÇU DU RAPPORT */}
                <section className="preview-panel">
                  <div className="panel-header">
                    <h2>Aperçu du rapport</h2>
                    <span className="step-badge">Aperçu en direct</span>
                  </div>

                  <div className="email-preview">
                    <div className="email-toolbar">
                      <span className="email-dot red" />
                      <span className="email-dot yellow" />
                      <span className="email-dot green" />
                      <span className="email-toolbar-label">
                        Aperçu du rapport — {sprint.name}
                      </span>
                    </div>

                    <div className="email-body">
                      <div
                        className="html-email-preview"
                        dangerouslySetInnerHTML={{ __html: generateReport() }}
                      />
                    </div>
                  </div>

                  <div className="preview-actions">
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={copyReport}
                    >
                      {copied ? "✓ Rapport copié !" : "Copier le rapport"}
                    </button>

                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={downloadReport}
                    >
                      Télécharger le HTML
                    </button>

                  </div>

                  <div className="helper-card">
                    <strong>Astuce</strong>
                    <p>
                      Copie le rapport puis colle-le directement dans Outlook
                      ou Gmail pour conserver sa mise en forme. Le rendu peut
                      varier légèrement selon la messagerie.
                    </p>
                  </div>
                </section>
              </div>
            </>
          )}

          {/* PIED DE PAGE */}
          <div className="footer">
            Sprintly — Générateur de rapports de sprint
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
