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
  {
    key: "IT01ICCA-21771",
    title: "[VTO] V2 PDP",
    points: 3,
  },
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
  {
    key: "IT01ICCA-22149",
    title: "[Search] Keyboard opened in PLP",
    points: 1,
  },
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

const isValidLink = (link: string) =>
  /^https?:\/\//i.test(link.trim());

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
    Array.isArray(savedData.releases)
      ? savedData.releases
      : initialReleases
  );

  const [tickets, setTickets] = useState<Ticket[]>(() =>
    Array.isArray(savedData.tickets)
      ? savedData.tickets
      : initialTickets
  );

  const [history, setHistory] =
    useState<SprintHistoryItem[]>(loadSprintHistory);

  const [activeTab, setActiveTab] = useState("general");
  const [copied, setCopied] = useState(false);

  // ==========================================
  // SAUVEGARDE AUTOMATIQUE
  // ==========================================

  useEffect(() => {
    localStorage.setItem(
      "sprintly-data",
      JSON.stringify({
        sprint,
        releases,
        tickets,
      })
    );
  }, [sprint, releases, tickets]);

  useEffect(() => {
    localStorage.setItem(
      "sprintly-history",
      JSON.stringify(history)
    );
  }, [history]);

  // ==========================================
  // CALCULS KPI
  // ==========================================

  const remainingPoints = tickets.reduce(
    (total, ticket) => total + Number(ticket.points || 0),
    0
  );

  const velocityPercentage =
    sprint.plannedVelocity > 0
      ? Math.round(
          (sprint.actualVelocity / sprint.plannedVelocity) * 100
        )
      : 0;

  const initialPercentage =
    sprint.plannedVelocity > 0
      ? Math.round(
          (sprint.startPoints / sprint.plannedVelocity) * 100
        )
      : 0;

  const addedPercentage =
    sprint.plannedVelocity > 0
      ? Math.round(
          (sprint.addedPoints / sprint.plannedVelocity) * 100
        )
      : 0;

  const bugPercentage =
    sprint.actualVelocity > 0
      ? Math.round(
          (sprint.bugPoints / sprint.actualVelocity) * 100
        )
      : 0;

  // ==========================================
  // MISE À JOUR DES DONNÉES
  // ==========================================

  const updateSprint = (
    field: keyof Sprint,
    value: string | number
  ) => {
    setSprint((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateRelease = (
    index: number,
    field: keyof Release,
    value: string
  ) => {
    setReleases((previous) =>
      previous.map((release, i) =>
        i === index
          ? { ...release, [field]: value }
          : release
      )
    );
  };

  const addRelease = () => {
    setReleases((previous) => [
      ...previous,
      {
        version: "",
        date: "",
        name: "",
        description: "",
        link: "",
      },
    ]);
  };

  const removeRelease = (index: number) => {
    setReleases((previous) =>
      previous.filter((_, i) => i !== index)
    );
  };

  const updateTicket = (
    index: number,
    field: keyof Ticket,
    value: string | number
  ) => {
    setTickets((previous) =>
      previous.map((ticket, i) =>
        i === index
          ? { ...ticket, [field]: value }
          : ticket
      )
    );
  };

  const addTicket = () => {
    setTickets((previous) => [
      ...previous,
      {
        key: "",
        title: "",
        points: 0,
      },
    ]);
  };

  const removeTicket = (index: number) => {
    setTickets((previous) =>
      previous.filter((_, i) => i !== index)
    );
  };

  // ==========================================
  // HISTORIQUE DES SPRINTS
  // ==========================================

  const saveSprintToHistory = () => {
    const newItem: SprintHistoryItem = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      sprint: { ...sprint },
      releases: releases.map((release) => ({ ...release })),
      tickets: tickets.map((ticket) => ({ ...ticket })),
    };

    setHistory((previous) => [
      newItem,
      ...previous,
    ]);

    alert(
      `${sprint.name} a été enregistré dans l'historique.`
    );
  };

  const loadSprintFromHistory = (
    item: SprintHistoryItem
  ) => {
    setSprint({ ...item.sprint });

    setReleases(
      item.releases.map((release) => ({ ...release }))
    );

    setTickets(
      item.tickets.map((ticket) => ({ ...ticket }))
    );

    setActiveTab("general");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteSprintFromHistory = (id: string) => {
    if (
      !window.confirm(
        "Supprimer ce sprint de l'historique ?"
      )
    ) {
      return;
    }

    setHistory((previous) =>
      previous.filter((item) => item.id !== id)
    );
  };

  const duplicateSprintFromHistory = (
    item: SprintHistoryItem
  ) => {
    setSprint({
      ...item.sprint,
      name: `${item.sprint.name} (copie)`,
    });

    setReleases(
      item.releases.map((release) => ({ ...release }))
    );

    setTickets(
      item.tickets.map((ticket) => ({ ...ticket }))
    );

    setActiveTab("general");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ==========================================
  // GÉNÉRATION DU RAPPORT HTML
  // ==========================================

  // ==========================================
// GÉNÉRATION DU RAPPORT HTML — BLACK & WHITE
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
        </tr>
      `
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
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="3" style="padding:18px;color:#777;">
          Aucune release renseignée.
        </td>
      </tr>
    `;

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
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="3" style="padding:18px;color:#777;">
          Aucun ticket restant.
        </td>
      </tr>
    `;

  const reportLinkHtml = isValidLink(sprint.reportLink)
    ? `
      <tr>
        <td style="padding:25px 32px;">
          <a href="${escapeHtml(sprint.reportLink)}"
             style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:13px 19px;font-size:12px;font-weight:bold;">
            Consulter le rapport complet →
          </a>
        </td>
      </tr>
    `
    : "";

  const progressWidth = Math.min(
    100,
    Math.max(0, velocityPercentage)
  );

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(sprint.name)} - Sprint Report</title>
</head>

<body style="margin:0;padding:0;background:#f1f1f1;font-family:Arial,Helvetica,sans-serif;color:#171717;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f1f1;">
<tr>
<td align="center" style="padding:30px 12px;">

<table width="100%" cellpadding="0" cellspacing="0"
style="max-width:680px;background:#fff;border-collapse:collapse;">

<!-- HEADER -->

<tr>
<td style="background:#111;padding:36px 32px;">

<div style="font-size:11px;letter-spacing:3px;color:#aaa;margin-bottom:18px;">
SPRINT REPORT
</div>

<div style="font-size:30px;line-height:38px;font-weight:bold;color:#fff;">
${escapeHtml(sprint.name)}
</div>

<div style="font-size:12px;color:#ccc;margin-top:12px;">
${escapeHtml(formatDate(sprint.startDate))}
&nbsp; — &nbsp;
${escapeHtml(formatDate(sprint.endDate))}
</div>

</td>
</tr>

<!-- INTRODUCTION -->

<tr>
<td style="padding:30px 32px;font-size:13px;line-height:23px;color:#444;">

Bonjour à tous,<br><br>

Voici le récapitulatif du
<strong>${escapeHtml(sprint.name)}</strong>,
qui s'est déroulé du
${escapeHtml(formatLongDate(sprint.startDate))}
au
${escapeHtml(formatLongDate(sprint.endDate))}.

</td>
</tr>

<!-- OBJECTIFS -->

<tr>
<td style="padding:8px 32px 25px;">

<table width="100%" cellpadding="0" cellspacing="0"
style="background:#f7f7f7;border-left:4px solid #111;">

<tr>
<td style="padding:19px 20px;">

<div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#111;margin-bottom:12px;">
OBJECTIFS DU SPRINT
</div>

<table width="100%" cellpadding="0" cellspacing="0">
${objectivesHtml}
</table>

</td>
</tr>
</table>

</td>
</tr>

<!-- RELEASES -->

<tr>
<td style="padding:10px 32px 25px;">

<div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#777;margin-bottom:15px;">
01 / RELEASES
</div>

<table width="100%" cellpadding="0" cellspacing="0"
style="border-collapse:collapse;table-layout:fixed;">

<tr style="background:#111;color:#fff;">
<th width="30%" align="left" style="padding:12px;font-size:11px;color:#fff;">VERSION</th>
<th width="40%" align="left" style="padding:12px;font-size:11px;color:#fff;">APPLICATION</th>
<th width="30%" align="right" style="padding:12px;font-size:11px;color:#fff;">LIEN</th>
</tr>

${releaseHtml}

</table>
</td>
</tr>

<!-- VELOCITY -->

<tr>
<td style="padding:15px 32px 25px;">

<div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#777;margin-bottom:15px;">
02 / SPRINT VELOCITY
</div>

<table width="100%" cellpadding="0" cellspacing="0"
style="border-collapse:collapse;table-layout:fixed;">

<tr>

<td width="32%" style="padding:17px 12px;background:#f1f1f1;">
<div style="font-size:11px;color:#666;font-weight:bold;">OBJECTIF</div>

<div style="font-size:27px;font-weight:bold;color:#111;margin-top:8px;">
${sprint.plannedVelocity}
</div>

<div style="font-size:11px;color:#777;">Story points</div>
</td>

<td width="2%"></td>

<td width="32%" style="padding:17px 12px;background:#111;color:#fff;">
<div style="font-size:11px;color:#ccc;font-weight:bold;">RÉALISÉ</div>

<div style="font-size:27px;font-weight:bold;color:#fff;margin-top:8px;">
${sprint.actualVelocity}
</div>

<div style="font-size:11px;color:#ccc;">Story points</div>
</td>

<td width="2%"></td>

<td width="32%" style="padding:17px 12px;background:#e5e5e5;">
<div style="font-size:11px;color:#555;font-weight:bold;">PERFORMANCE</div>

<div style="font-size:27px;font-weight:bold;color:#111;margin-top:8px;">
${velocityPercentage}%
</div>

<div style="font-size:11px;color:#777;">De l'objectif</div>
</td>

</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0"
style="margin-top:15px;background:#e5e5e5;">
<tr>
<td width="${progressWidth}%" height="7" style="background:#111;"></td>
<td></td>
</tr>
</table>

<div style="font-size:11px;color:#777;margin-top:7px;">
${sprint.actualVelocity} points réalisés sur ${sprint.plannedVelocity} points prévus.
</div>

</td>
</tr>

<!-- DETAILS -->

<tr>
<td style="padding:15px 32px 25px;">

<div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#777;margin-bottom:15px;">
03 / SPRINT DETAILS
</div>

<table width="100%" cellpadding="0" cellspacing="0"
style="border-collapse:collapse;">

<tr>
<td style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;color:#333;">
Tickets au démarrage
</td>

<td align="right" style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;font-weight:bold;color:#111;">
${sprint.startTickets} tickets · ${sprint.startPoints} pts
</td>

<td align="right" width="55" style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:11px;color:#777;">
${initialPercentage}%
</td>
</tr>

<tr>
<td style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;color:#333;">
Tickets ajoutés
</td>

<td align="right" style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;font-weight:bold;color:#111;">
${sprint.addedTickets} tickets · ${sprint.addedPoints} pts
</td>

<td align="right" width="55" style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:11px;color:#777;">
${addedPercentage}%
</td>
</tr>

<tr>
<td style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;color:#333;">
Tickets réestimés
</td>

<td colspan="2" align="right" style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;font-weight:bold;color:#111;">
${sprint.reestimatedTickets} tickets · +${sprint.reestimatedPoints} pts
</td>
</tr>

<tr>
<td style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;color:#333;">
Effort bugs
</td>

<td colspan="2" align="right" style="padding:13px 0;border-bottom:1px solid #e5e5e5;font-size:12px;font-weight:bold;color:#111;">
${sprint.bugPoints} pts · ${bugPercentage}%
</td>
</tr>

</table>
</td>
</tr>

<!-- TICKETS RESTANTS -->

<tr>
<td style="padding:15px 32px 30px;">

<table width="100%" cellpadding="0" cellspacing="0"
style="background:#f1f1f1;margin-bottom:17px;">

<tr>
<td style="padding:18px 20px;">

<div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#555;">
04 / REMAINING STORY POINTS
</div>

<div style="font-size:27px;font-weight:bold;color:#111;margin-top:5px;">
${remainingPoints} pts
</div>

<div style="font-size:11px;color:#777;">
${tickets.length} tickets non terminés
</div>

</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0"
style="border-collapse:collapse;table-layout:fixed;">

<tr style="background:#111;">
<th width="27%" align="left" style="padding:11px 9px;font-size:11px;color:#fff;">TICKET</th>
<th width="53%" align="left" style="padding:11px 9px;font-size:11px;color:#fff;">DESCRIPTION</th>
<th width="20%" align="right" style="padding:11px 9px;font-size:11px;color:#fff;">POINTS</th>
</tr>

${ticketHtml}

</table>
</td>
</tr>

${reportLinkHtml}

<!-- FOOTER -->

<tr>
<td style="padding:28px 32px;background:#111;color:#fff;">

<div style="font-size:13px;line-height:22px;color:#eee;">
Bon week-end à tous,
</div>

<div style="font-size:13px;font-weight:bold;color:#fff;margin-top:5px;">
${escapeHtml(sprint.signatories)}
</div>

<div style="font-size:11px;color:#999;margin-top:18px;letter-spacing:1px;">
SPRINTLY · ${escapeHtml(sprint.name).toUpperCase()}
</div>

</td>
</tr>

</table>
</td>
</tr>
</table>

</body>
</html>
`;
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
        "text/html": new Blob([html], {
          type: "text/html",
        }),
        "text/plain": new Blob([plainText], {
          type: "text/plain",
        }),
      });

      await navigator.clipboard.write([clipboardItem]);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
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

    const blob = new Blob([html], {
      type: "text/html;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `${sprint.name.replace(/\s+/g, "-")}-report.html`;

    link.click();

    URL.revokeObjectURL(url);
  };

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <div className="app">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">S</div>

          <div className="brand-name">
            <strong>Sprintly</strong>
            <span>SPRINT MANAGEMENT</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <div
          className={`nav-item ${activeTab === "general" ? "active" : ""}`}
          onClick={() => setActiveTab("general")}
        >
          ◈ &nbsp; Sprint report
        </div>

        <div
          className={`nav-item ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          ◷ &nbsp; Historique des sprints
        </div>

        <div className="sidebar-bottom">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar">M</div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Manon
              </div>

              <div style={{ fontSize: 11, opacity: 0.6 }}>
                Workspace
              </div>
            </div>
          </div>
        </div>

      </aside>

      {/* MAIN */}

      <main className="main">

        <header className="topbar">

          <div className="breadcrumb">
            Workspace / <strong>
              {activeTab === "history"
                ? "Historique"
                : "Sprint report"}
            </strong>
          </div>

          <div className="topbar-actions">

            <span className="saved-status">
              ● Sauvegarde automatique
            </span>

            <button
              className="button button-secondary"
              onClick={downloadReport}
            >
              Télécharger
            </button>

          </div>

        </header>

        <div className="content">

          {/* PAGE HEADING */}

          <div className="page-heading">

            <div className="eyebrow">
              SPRINT MANAGEMENT
            </div>

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

          {/* HISTORIQUE */}

          {activeTab === "history" ? (

            <section className="history-panel">

              <div className="history-header">

                <div>
                  <h2>Historique des sprints</h2>

                  <p>
                    {history.length} sprint(s) enregistré(s)
                  </p>
                </div>

                <button
                  className="button button-primary"
                  onClick={() => setActiveTab("general")}
                >
                  Retour au rapport
                </button>

              </div>

              {history.length === 0 ? (

                <div className="history-empty">
                  Aucun sprint enregistré pour le moment.
                  Ouvre un rapport et clique sur
                  « Enregistrer ce sprint ».
                </div>

              ) : (

                <div className="history-list">

                  {history.map((item) => (

                    <div className="history-item" key={item.id}>

                      <div className="history-info">

                        <strong>
                          {item.sprint.name}
                        </strong>

                        <span>
                          {formatDate(item.sprint.startDate)}
                          {" — "}
                          {formatDate(item.sprint.endDate)}
                        </span>

                        <small>
                          Enregistré le{" "}
                          {new Date(item.savedAt).toLocaleDateString("fr-FR")}
                        </small>

                      </div>

                      <div className="history-stats">

                        <strong>
                          {item.sprint.actualVelocity} pts
                        </strong>

                        <span>
                          Vélocité réelle
                        </span>

                      </div>

                      <div className="history-actions">

                        <button
                          className="button button-secondary"
                          onClick={() => loadSprintFromHistory(item)}
                        >
                          Ouvrir
                        </button>

                        <button
                          className="button button-secondary"
                          onClick={() => duplicateSprintFromHistory(item)}
                        >
                          Dupliquer
                        </button>

                        <button
                          className="remove-button"
                          onClick={() => deleteSprintFromHistory(item.id)}
                        >
                          Supprimer
                        </button>

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </section>

          ) : (

            <>

              {/* KPI */}

              <div className="stats-grid">

                <div className="stat-card">

                  <div className="stat-top">
                    <div className="stat-label">
                      Planned velocity
                    </div>

                    <div className="kpi-icon purple">
                      ◎
                    </div>
                  </div>

                  <div className="stat-value">
                    {sprint.plannedVelocity} <span>pts</span>
                  </div>

                  <div className="stat-footer">
                    Objectif du sprint
                  </div>

                </div>

                <div className="stat-card">

                  <div className="stat-top">
                    <div className="stat-label">
                      Actual velocity
                    </div>

                    <div className="kpi-icon green">
                      ↗
                    </div>
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
                    <div className="stat-label">
                      Remaining points
                    </div>

                    <div className="kpi-icon orange">
                      ◷
                    </div>
                  </div>

                  <div className="stat-value">
                    {remainingPoints} <span>pts</span>
                  </div>

                  <div className="stat-footer">
                    Tickets non terminés
                  </div>

                </div>

                <div className="stat-card">

                  <div className="stat-top">
                    <div className="stat-label">
                      Bug effort
                    </div>

                    <div className="kpi-icon red">
                      ⚑
                    </div>
                  </div>

                  <div className="stat-value">
                    {sprint.bugPoints} <span>pts</span>
                  </div>

                  <div className="stat-footer">
                    {bugPercentage}% de la vélocité réelle
                  </div>

                </div>

              </div>

              {/* WORKSPACE */}

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
                        onChange={(e) =>
                          updateSprint("name", e.target.value)
                        }
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

                  {/* VELOCITY */}

                  <div className="form-section">

                    <div className="section-heading">
                      02 — Indicateurs de vélocité
                    </div>

                    <div className="field-row">

                      <div className="field">
                        <label>Vélocité prévue (points)</label>

                        <input
                          type="number"
                          value={sprint.plannedVelocity}
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
                          value={sprint.actualVelocity}
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
                          value={sprint.startTickets}
                          onChange={(e) =>
                            updateSprint(
                              "startTickets",
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="field">
                        <label>Points au démarrage</label>

                        <input
                          type="number"
                          value={sprint.startPoints}
                          onChange={(e) =>
                            updateSprint(
                              "startPoints",
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>

                    </div>

                    <div className="field-row">

                      <div className="field">
                        <label>Tickets ajoutés</label>

                        <input
                          type="number"
                          value={sprint.addedTickets}
                          onChange={(e) =>
                            updateSprint(
                              "addedTickets",
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="field">
                        <label>Points ajoutés</label>

                        <input
                          type="number"
                          value={sprint.addedPoints}
                          onChange={(e) =>
                            updateSprint(
                              "addedPoints",
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>

                    </div>

                    <div className="field-row">

                      <div className="field">
                        <label>Tickets réestimés</label>

                        <input
                          type="number"
                          value={sprint.reestimatedTickets}
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
                          value={sprint.reestimatedPoints}
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
                        value={sprint.bugPoints}
                        onChange={(e) =>
                          updateSprint(
                            "bugPoints",
                            Number(e.target.value)
                          )
                        }
                      />
                    </div>

                  </div>

                  {/* RELEASES */}

                  <div className="form-section">

                    <div className="section-heading">
                      03 — Releases
                    </div>

                    {releases.map((release, index) => (

                      <div className="dynamic-card" key={index}>

                        <div className="dynamic-card-header">
                          <strong>Release {index + 1}</strong>

                          <button
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
                                updateRelease(
                                  index,
                                  "version",
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <div className="field">
                            <label>Date</label>

                            <input
                              type="date"
                              value={release.date}
                              onChange={(e) =>
                                updateRelease(
                                  index,
                                  "date",
                                  e.target.value
                                )
                              }
                            />
                          </div>

                        </div>

                        <div className="field">
                          <label>Application</label>

                          <input
                            value={release.name}
                            onChange={(e) =>
                              updateRelease(
                                index,
                                "name",
                                e.target.value
                              )
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
                              updateRelease(
                                index,
                                "link",
                                e.target.value
                              )
                            }
                            placeholder="https://..."
                          />
                        </div>

                      </div>

                    ))}

                    <button
                      className="button button-secondary"
                      onClick={addRelease}
                    >
                      + Ajouter une release
                    </button>

                  </div>

                  {/* TICKETS */}

                  <div className="form-section">

                    <div className="section-heading">
                      04 — Tickets restants
                    </div>

                    {tickets.map((ticket, index) => (

                      <div className="dynamic-card" key={index}>

                        <div className="dynamic-card-header">
                          <strong>Ticket {index + 1}</strong>

                          <button
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
                              updateTicket(
                                index,
                                "key",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="field">
                          <label>Description</label>

                          <input
                            value={ticket.title}
                            onChange={(e) =>
                              updateTicket(
                                index,
                                "title",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="field">
                          <label>Story points</label>

                          <input
                            type="number"
                            value={ticket.points}
                            onChange={(e) =>
                              updateTicket(
                                index,
                                "points",
                                Number(e.target.value)
                              )
                            }
                          />
                        </div>

                      </div>

                    ))}

                    <button
                      className="button button-secondary"
                      onClick={addTicket}
                    >
                      + Ajouter un ticket
                    </button>

                  </div>

                  {/* FINALISATION */}

                  <div className="form-section">

                    <div className="section-heading">
                      05 — Finalisation
                    </div>

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

                {/* APERÇU */}

                <section className="preview-panel">

                  <div className="panel-header">
                    <h2>Aperçu du rapport</h2>
                    <span className="step-badge">Live preview</span>
                  </div>

                  <div className="email-preview">

                    <div className="email-toolbar">
                      <span className="email-dot red"></span>
                      <span className="email-dot yellow"></span>
                      <span className="email-dot green"></span>

                      <span className="email-toolbar-label">
                        Email preview — {sprint.name}
                      </span>
                    </div>

                    <div className="email-body">
                      <div
                        className="html-email-preview"
                        dangerouslySetInnerHTML={{
                          __html: generateReport(),
                        }}
                      />
                    </div>

                  </div>

                  <div className="preview-actions">

                    <button
                      className="button button-primary"
                      onClick={copyReport}
                    >
                      {copied
                        ? "✓ Rapport copié !"
                        : "Copier le rapport"}
                    </button>

                    <button
                      className="button button-secondary"
                      onClick={downloadReport}
                    >
                      Télécharger HTML
                    </button>

                  </div>

                  <div className="helper-card">
                    <strong>Astuce</strong>

                    <p>
                      Copie le rapport puis colle-le directement dans
                      Outlook ou Gmail pour conserver sa mise en forme.
                      Le rendu peut varier légèrement selon la messagerie.
                    </p>
                  </div>

                </section>

              </div>

            </>

          )}

          <div className="footer">
            Sprintly — Sprint report generator
          </div>

        </div>

      </main>

    </div>
  );
}

export default App;