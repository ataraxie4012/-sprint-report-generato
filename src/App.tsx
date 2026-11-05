import { useState } from "react";
import "./App.css";

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

function App() {
  const [sprint, setSprint] = useState<Sprint>(initialSprint);
  const [releases, setReleases] = useState<Release[]>(initialReleases);
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [activeTab, setActiveTab] = useState("general");
  const [copied, setCopied] = useState(false);

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

  const updateSprint = (field: keyof Sprint, value: string | number) => {
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
        i === index ? { ...release, [field]: value } : release
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
      {
        key: "",
        title: "",
        points: 0,
      },
    ]);
  };

  const removeTicket = (index: number) => {
    setTickets((previous) => previous.filter((_, i) => i !== index));
  };

  const generateReport = () => {
    const objectivesHtml = sprint.objectives
      .split(/\n/)
      .map((objective) => objective.trim())
      .filter(Boolean)
      .map(
        (objective) => `
          <li style="font-size:14px;line-height:22px;margin-bottom:6px;color:#333333;">
            ${escapeHtml(objective)}
          </li>
        `
      )
      .join("");

    const releaseHtml = releases
  .map(
    (release) => `
      <tr style="background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
        <td style="width:40%;padding:14px 12px;border-bottom:1px solid #eeeeee;vertical-align:middle;text-align:left;">
          <div style="font-size:13px;line-height:20px;color:#222222;">
            <strong>${escapeHtml(release.version)}</strong>
          </div>
          ${
            release.description
              ? `<div style="font-size:11px;line-height:17px;color:#555555;margin-top:3px;">${escapeHtml(release.description)}</div>`
              : ""
          }
          <div style="font-size:11px;line-height:17px;color:#777777;margin-top:3px;">
            ${escapeHtml(formatDate(release.date))}
          </div>
        </td>

        <td style="width:30%;padding:14px 12px;border-bottom:1px solid #eeeeee;vertical-align:middle;text-align:left;font-size:13px;line-height:20px;color:#333333;">
          ${escapeHtml(release.name)}
        </td>

        <td align="center" style="width:30%;padding:14px 12px;border-bottom:1px solid #eeeeee;vertical-align:middle;text-align:center;">
          ${
            isValidLink(release.link)
              ? `
                <a href="${escapeHtml(release.link)}"
                   style="display:inline-block;background-color:#111111;color:#ffffff;text-decoration:none;padding:10px 12px;font-size:11px;line-height:16px;font-weight:bold;white-space:nowrap;">
                  Voir les tickets →
                </a>
              `
              : `<span style="font-size:11px;color:#999999;">Lien à ajouter</span>`
          }
        </td>
      </tr>
    `
  )
  .join("");

    const ticketHtml = tickets
      .map(
        (ticket) => `
          <tr>
            <td style="padding:11px 12px;border-bottom:1px solid #eeeeee;font-size:11px;line-height:17px;color:#555555;">
              ${escapeHtml(ticket.key)}
            </td>
            <td style="padding:11px 12px;border-bottom:1px solid #eeeeee;font-size:13px;line-height:19px;color:#333333;">
              ${escapeHtml(ticket.title)}
            </td>
            <td align="right" style="padding:11px 12px;border-bottom:1px solid #eeeeee;font-size:13px;line-height:19px;font-weight:bold;color:#222222;white-space:nowrap;">
              ${escapeHtml(ticket.points)} pts
            </td>
          </tr>
        `
      )
      .join("");

    const reportLinkHtml = isValidLink(sprint.reportLink)
      ? `
        <tr>
          <td style="padding:28px 36px 10px;">
            <a href="${escapeHtml(sprint.reportLink)}"
               style="display:inline-block;background-color:#111111;color:#ffffff;text-decoration:none;padding:13px 20px;font-size:12px;line-height:18px;font-weight:bold;">
              Voir le rapport complet du sprint →
            </a>
          </td>
        </tr>
      `
      : "";

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(sprint.name)} - Sprint Report</title>
</head>

<body style="margin:0;padding:0;background-color:#f3f3f3;font-family:Arial,Helvetica,sans-serif;color:#333333;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f3f3;">
<tr>
<td align="center" style="padding:30px 12px;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;background-color:#ffffff;">

<!-- BANDEAU NOIR -->
<tr>
<td style="background-color:#111111;padding:34px 36px;color:#ffffff;">

  <div style="font-size:11px;line-height:17px;font-weight:bold;letter-spacing:3px;color:#bbbbbb;margin-bottom:16px;">
    SPRINT REPORT
  </div>

  <div style="font-size:30px;line-height:36px;font-weight:bold;color:#ffffff;margin-bottom:12px;">
    ${escapeHtml(sprint.name)}
  </div>
</td>
</tr>

<!-- INTRODUCTION -->
<tr>
<td style="padding:30px 36px 10px;font-size:14px;line-height:23px;color:#444444;">
  Bonjour à tous,<br /><br />
  Voici le récapitulatif du <strong>${escapeHtml(sprint.name)}</strong>
  qui s'est déroulé du ${escapeHtml(formatLongDate(sprint.startDate))}
  au ${escapeHtml(formatLongDate(sprint.endDate))}.
</td>
</tr>

<!-- OBJECTIFS -->
<tr>
<td style="padding:22px 36px 10px;">
  <div style="font-size:11px;line-height:17px;font-weight:bold;letter-spacing:1.5px;color:#888888;margin-bottom:12px;">
    OBJECTIFS DU SPRINT
  </div>

  <ul style="margin:0;padding-left:20px;">
    ${objectivesHtml}
  </ul>
</td>
</tr>

<!-- RELEASES -->
<tr>
<td style="padding:25px 36px 10px;">
  <div style="font-size:11px;line-height:17px;font-weight:bold;letter-spacing:1.5px;color:#888888;margin-bottom:14px;">
    RELEASES
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
    <tr style="background-color:#f5f5f5;">
      <th align="left" style="padding:11px 12px;font-size:11px;line-height:16px;letter-spacing:1px;color:#777777;">VERSION</th>
      <th align="left" style="padding:11px 12px;font-size:11px;line-height:16px;letter-spacing:1px;color:#777777;">APPLICATION</th>
      <th align="right" style="padding:11px 12px;font-size:11px;line-height:16px;letter-spacing:1px;color:#777777;">TICKETS</th>
    </tr>
    ${releaseHtml}
  </table>
</td>
</tr>

<!-- KPI -->
<tr>
<td style="padding:30px 36px 10px;">
  <div style="font-size:11px;line-height:17px;font-weight:bold;letter-spacing:1.5px;color:#888888;margin-bottom:14px;">
    SPRINT VELOCITY
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;border-collapse:collapse;">
    <tr>
      <td width="50%" style="padding:16px;background-color:#f5f5f5;border:1px solid #eeeeee;height:100px;vertical-align:top;">
        <div style="font-size:12px;line-height:18px;font-weight:bold;letter-spacing:0.5px;color:#777777;">
          PLANNED VELOCITY
        </div>
        <div style="font-size:27px;line-height:34px;font-weight:bold;color:#222222;margin-top:8px;">
          ${sprint.plannedVelocity}
          <span style="font-size:13px;line-height:18px;font-weight:normal;">pts</span>
        </div>
      </td>

      <td width="50%" style="padding:16px;background-color:#111111;border:1px solid #111111;height:100px;vertical-align:top;">
        <div style="font-size:12px;line-height:18px;font-weight:bold;letter-spacing:0.5px;color:#bbbbbb;">
          ACTUAL VELOCITY
        </div>
        <div style="font-size:27px;line-height:34px;font-weight:bold;color:#ffffff;margin-top:8px;">
          ${sprint.actualVelocity}
          <span style="font-size:13px;line-height:18px;font-weight:normal;color:#cccccc;">pts</span>
        </div>
        <div style="font-size:11px;line-height:16px;color:#cccccc;margin-top:5px;">
          ${velocityPercentage}% de la vélocité prévue
        </div>
      </td>
    </tr>
  </table>
</td>
</tr>

<!-- DETAILS -->
<tr>
<td style="padding:20px 36px 10px;">

  <div style="font-size:11px;line-height:17px;font-weight:bold;letter-spacing:1.5px;color:#888888;margin-bottom:14px;">
    SPRINT DETAILS
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">

    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:13px;line-height:19px;color:#555555;">
        <strong>Tickets au démarrage</strong>
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:13px;line-height:19px;font-weight:bold;color:#333333;">
        ${sprint.startTickets} tickets / ${sprint.startPoints} pts
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:11px;line-height:17px;color:#888888;">
        ${initialPercentage}%
      </td>
    </tr>

    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:13px;line-height:19px;color:#555555;">
        <strong>Tickets ajoutés pendant le sprint</strong>
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:13px;line-height:19px;font-weight:bold;color:#333333;">
        ${sprint.addedTickets} tickets / ${sprint.addedPoints} pts
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:11px;line-height:17px;color:#888888;">
        ${addedPercentage}%
      </td>
    </tr>

    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:13px;line-height:19px;color:#555555;">
        <strong>Tickets réestimés</strong>
      </td>
      <td align="right" colspan="2" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:13px;line-height:19px;font-weight:bold;color:#333333;">
        ${sprint.reestimatedTickets} tickets / +${sprint.reestimatedPoints} pts
      </td>
    </tr>

    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:13px;line-height:19px;color:#555555;">
        <strong>Effort bugs</strong>
      </td>
      <td align="right" colspan="2" style="padding:12px 0;border-bottom:1px solid #eeeeee;font-size:13px;line-height:19px;font-weight:bold;color:#333333;">
        ${sprint.bugPoints} pts (${bugPercentage}% de la vélocité réelle)
      </td>
    </tr>

  </table>
</td>
</tr>

<!-- REMAINING TICKETS -->
<tr>
<td style="padding:30px 36px 10px;">

  <div style="font-size:11px;line-height:17px;font-weight:bold;letter-spacing:1.5px;color:#888888;margin-bottom:8px;">
    REMAINING STORY POINTS
  </div>

  <div style="font-size:25px;line-height:32px;font-weight:bold;color:#222222;margin-bottom:15px;">
    ${remainingPoints} pts
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">

    <tr style="background-color:#f5f5f5;">
      <th align="left" style="padding:11px 12px;font-size:11px;line-height:16px;color:#777777;">TICKET</th>
      <th align="left" style="padding:11px 12px;font-size:11px;line-height:16px;color:#777777;">DESCRIPTION</th>
      <th align="right" style="padding:11px 12px;font-size:11px;line-height:16px;color:#777777;">POINTS</th>
    </tr>

    ${ticketHtml}

  </table>
</td>
</tr>

<!-- LIEN RAPPORT COMPLET -->
${reportLinkHtml}

<!-- SIGNATURE SANS ENCADRÉ -->
<tr>
<td style="padding:30px 36px 36px;background-color:#ffffff;font-size:13px;line-height:22px;color:#555555;">
  Retrouvez le détail des tickets terminés, non terminés et retirés dans le rapport complet.<br /><br />

  Bon week-end à tous,<br />
  <strong style="font-size:13px;line-height:22px;color:#222222;">${escapeHtml(sprint.signatories)}</strong>
  <br /><br />
  <span style="font-size:11px;line-height:17px;color:#999999;">SPRINT REPORT · ${escapeHtml(sprint.name)}</span>
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

  const copyReport = async () => {
    try {
      const html = generateReport();

      const plainText = `
Bonjour à tous,

Voici le récapitulatif du ${sprint.name} qui s'est déroulé du ${formatLongDate(
        sprint.startDate
      )} au ${formatLongDate(sprint.endDate)}.

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
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Erreur lors de la copie :", error);
      alert(
        "La copie HTML n'a pas fonctionné. Essaie de télécharger le rapport."
      );
    }
  };

  const downloadReport = () => {
    const html = generateReport();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${sprint.name.replace(/\s+/g, "-")}-report.html`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const openInEmail = () => {
    const subject = `Récapitulatif ${sprint.name}`;

    const body = `
Bonjour à tous,

Voici le récapitulatif du ${sprint.name} qui s'est déroulé du ${formatLongDate(
      sprint.startDate
    )} au ${formatLongDate(sprint.endDate)}.

Objectifs :
${sprint.objectives}

Vélocité prévue : ${sprint.plannedVelocity} points
Vélocité réelle : ${sprint.actualVelocity} points
Tickets restants : ${remainingPoints} points

Bon week-end à tous,
${sprint.signatories}
    `.trim();

    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <span>Sprintly</span>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <div
          className={`nav-item ${activeTab === "general" ? "active" : ""}`}
          onClick={() => setActiveTab("general")}
        >
          ◈ &nbsp; Sprint report
        </div>

        <div className="sidebar-bottom">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar">M</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Manon</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>Workspace</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace / <strong>Sprint report</strong>
          </div>

          <div className="topbar-actions">
            <span className="saved-status">● Modifications locales</span>

            <button className="button button-secondary" onClick={downloadReport}>
              Télécharger
            </button>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div className="eyebrow">SPRINT MANAGEMENT</div>
            <h1>Rapport de sprint</h1>
            <p style={{ color: "#888888", fontSize: 13 }}>
              Configure tes données et génère automatiquement ton rapport.
            </p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Planned velocity</div>
              <div className="stat-value">{sprint.plannedVelocity} pts</div>
              <div className="stat-footer">Objectif du sprint</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Actual velocity</div>
              <div className="stat-value">{sprint.actualVelocity} pts</div>
              <div className="stat-footer positive">
                {velocityPercentage}% de l'objectif
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Remaining points</div>
              <div className="stat-value">{remainingPoints} pts</div>
              <div className="stat-footer">Tickets non terminés</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Bug effort</div>
              <div className="stat-value">{sprint.bugPoints} pts</div>
              <div className="stat-footer">
                {bugPercentage}% de la vélocité réelle
              </div>
            </div>
          </div>

          <div className="workspace">
            {/* FORMULAIRE */}
            <section className="form-panel">
              <div className="panel-header">
                <h2>Configuration du rapport</h2>
                <span className="step-badge">Édition</span>
              </div>

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
                      onChange={(e) => updateSprint("endDate", e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Objectifs du sprint</label>
                  <textarea
                    value={sprint.objectives}
                    onChange={(e) => updateSprint("objectives", e.target.value)}
                    placeholder="Un objectif par ligne"
                  />
                </div>
              </div>

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
                        updateSprint("plannedVelocity", Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="field">
                    <label>Vélocité réelle (points)</label>
                    <input
                      type="number"
                      value={sprint.actualVelocity}
                      onChange={(e) =>
                        updateSprint("actualVelocity", Number(e.target.value))
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
                        updateSprint("startTickets", Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="field">
                    <label>Points au démarrage</label>
                    <input
                      type="number"
                      value={sprint.startPoints}
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
                      value={sprint.addedTickets}
                      onChange={(e) =>
                        updateSprint("addedTickets", Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="field">
                    <label>Points ajoutés</label>
                    <input
                      type="number"
                      value={sprint.addedPoints}
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
                      updateSprint("bugPoints", Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="form-section">
                <div className="section-heading">03 — Releases</div>

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
                          updateRelease(index, "description", e.target.value)
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

                <button className="button button-secondary" onClick={addRelease}>
                  + Ajouter une release
                </button>
              </div>

              <div className="form-section">
                <div className="section-heading">04 — Tickets restants</div>

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
                      <label>Story points</label>
                      <input
                        type="number"
                        value={ticket.points}
                        onChange={(e) =>
                          updateTicket(index, "points", Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                ))}

                <button className="button button-secondary" onClick={addTicket}>
                  + Ajouter un ticket
                </button>
              </div>

              <div className="form-section">
                <div className="section-heading">05 — Finalisation</div>

                <div className="field">
                  <label>Lien vers le rapport complet</label>
                  <input
                    value={sprint.reportLink}
                    onChange={(e) => updateSprint("reportLink", e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="field">
                  <label>Signataires</label>
                  <input
                    value={sprint.signatories}
                    onChange={(e) => updateSprint("signatories", e.target.value)}
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
                    dangerouslySetInnerHTML={{ __html: generateReport() }}
                  />
                </div>
              </div>

              <div className="preview-actions">
                <button className="button button-primary" onClick={copyReport}>
                  {copied ? "✓ Rapport copié !" : "Copier le rapport"}
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
                  Copie le rapport puis colle-le directement dans Outlook ou
                  Gmail pour conserver sa mise en forme. Le rendu peut varier
                  légèrement selon la messagerie.
                </p>
              </div>
            </section>
          </div>

          <div className="footer">Sprintly — Sprint report generator</div>
        </div>
      </main>
    </div>
  );
}

export default App;