import MobileNavigation from "./MobileNavigation";
import ThemeSettings from "./ThemeSettings";
import SprintNavigation from "./SprintNavigation";
import type { SprintPage } from "./SprintNavigation";
import { canOpenBothWorkspaces } from "./accessRoutes";
import { profileNameForEmail } from "./userProfile";
import NavIcon from "./NavIcon";
import { useEffect, useRef, useState } from "react";
import type {
  Dispatch,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  SetStateAction,
} from "react";
import "./App.css";
import webwagLogo from "./webwag.svg";

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

type EditableItem<T> = T & { editorId: string };
type CardKind = "release" | "ticket";
type CardMove = { kind: CardKind; id: string };

type CardDrop = { id: string; before: boolean };

type CardDrag = {
  id: string;
  pointerId: number;
  startY: number;
  x: number;
  y: number;
  frame: number | null;
  target: CardDrop | null;
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

const formatPoints = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 3,
});

const formatPointDifference = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 3,
  signDisplay: "exceptZero",
});

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

const toEditableItems = <T,>(items: T[]): EditableItem<T>[] =>
  items.map((item) => ({ ...item, editorId: makeId() }));

const toSavedItems = <T extends { editorId: string },>(items: T[]) =>
  items.map(({ editorId: _editorId, ...item }) => item);

type ReorderableCardsProps<T extends { editorId: string }> = {
  kind: CardKind;
  items: T[];
  setItems: Dispatch<SetStateAction<T[]>>;
  onMove: (move: CardMove) => void;
  onRemove: (id: string) => void;
  children: (item: T) => ReactNode;
};

function ReorderableCards<T extends { editorId: string }>({
  kind,
  items,
  setItems,
  onMove,
  onRemove,
  children,
}: ReorderableCardsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<CardDrag | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  useEffect(() => {
    const clearSelectionOutside = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && !listRef.current?.contains(event.target)) {
        setSelectedCardId(null);
      }
    };
    document.addEventListener("pointerdown", clearSelectionOutside);
    return () => document.removeEventListener("pointerdown", clearSelectionOutside);
  }, []);

  const [dropPreview, setDropPreview] = useState<{
    draggedId: string;
    target: CardDrop | null;
  } | null>(null);

  useEffect(() => {
    return () => {
      const frame = dragState.current?.frame;
      if (frame != null) window.cancelAnimationFrame(frame);
      dragState.current = null;
    };
  }, []);

  const moveCard = (id: string, target: CardDrop) => {
    if (id === target.id) return;
    const sourceIndex = items.findIndex(({ editorId }) => editorId === id);
    const targetIndex = items.findIndex(({ editorId }) => editorId === target.id);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const insertionIndex =
      targetIndex + (target.before ? 0 : 1) - (sourceIndex < targetIndex ? 1 : 0);
    if (sourceIndex === insertionIndex) return;

    setItems((previous) => {
      const item = previous.find(({ editorId }) => editorId === id);
      const next = previous.filter(({ editorId }) => editorId !== id);
      const targetIndex = next.findIndex(
        ({ editorId }) => editorId === target.id
      );
      if (!item || targetIndex === -1) return previous;

      next.splice(targetIndex + (target.before ? 0 : 1), 0, item);
      return next;
    });
    onMove({ kind, id });
  };

  const findCardDrop = (
    list: HTMLDivElement,
    { id, x, y }: Pick<CardDrag, "id" | "x" | "y">
  ) => {
    const bounds = list.getBoundingClientRect();
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) {
      return null;
    }

    let lastId: string | undefined;
    for (const card of Array.from(list.querySelectorAll<HTMLElement>("[data-reorder-id]"))) {
      const cardId = card.dataset.reorderId;
      if (!cardId || cardId === id) continue;
      const { top, height } = card.getBoundingClientRect();
      if (y < top + height / 2) {
        return { id: cardId, before: true };
      }
      lastId = cardId;
    }
    return lastId ? { id: lastId, before: false } : null;
  };

  const updateCardDrag = () => {
    const drag = dragState.current;
    const list = listRef.current;
    if (!drag || !list) return;

    const bounds = list.getBoundingClientRect();
    if (drag.x >= bounds.left && drag.x <= bounds.right) {
      const edge = 64;
      if (drag.y < edge && bounds.top < 0) window.scrollBy(0, -12);
      if (drag.y > window.innerHeight - edge && bounds.bottom > window.innerHeight) {
        window.scrollBy(0, 12);
      }
    }

    const target = findCardDrop(list, drag);
    if (target?.id !== drag.target?.id || target?.before !== drag.target?.before) {
      drag.target = target;
      setDropPreview({ draggedId: drag.id, target });
    }
    drag.frame = window.requestAnimationFrame(updateCardDrag);
  };

  const startCardDrag = (
    event: PointerEvent<HTMLButtonElement>,
    id: string
  ) => {
    if (event.button !== 0 || !event.isPrimary || dragState.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      id,
      pointerId: event.pointerId,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      frame: null,
      target: null,
    };
  };

  const trackCardDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;

    if (drag.frame === null && Math.abs(drag.y - drag.startY) >= 5) {
      setDropPreview({ draggedId: drag.id, target: null });
      updateCardDrag();
    }
  };

  const finishCardDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragState.current = null;
    if (drag.frame === null) return;

    window.cancelAnimationFrame(drag.frame);
    setDropPreview(null);
    const list = listRef.current;
    if (event.type === "pointerup" && list) {
      const target = findCardDrop(list, {
        id: drag.id,
        x: event.clientX,
        y: event.clientY,
      });
      if (target) moveCard(drag.id, target);
    }
  };

  const moveCardWithKeyboard = (
    event: KeyboardEvent<HTMLElement>,
    index: number
  ) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target instanceof HTMLElement && event.target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
    )) return;
    event.preventDefault();
    if (dragState.current) return;

    const before = event.key === "ArrowUp";
    const target = items[index + (before ? -1 : 1)];
    if (target) {
      const card = event.currentTarget;
      setSelectedCardId(items[index].editorId);
      moveCard(items[index].editorId, { id: target.editorId, before });
      window.requestAnimationFrame(() => {
        if (!card.isConnected) return;
        card.focus({ preventScroll: true });
        card.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
      });
    }
  };

  const title = kind === "release" ? "Release" : "Ticket";
  const handleLabel = kind === "release" ? "Déplacer la release" : "Déplacer le ticket";
  const hintId = `${kind}-drag-hint`;

  return (
    <>
      {items.length > 1 && (
        <p id={hintId} className="reorder-hint">
          Fais glisser la poignée ou sélectionne une carte puis utilise les flèches haut et bas.
        </p>
      )}
      <div className={`reorder-list ${kind}-list`} ref={listRef}>
        {items.map((item, index) => {
          const target = dropPreview?.target;
          let placement: "before" | "after" | undefined;
          if (target?.id === item.editorId) {
            placement = target.before ? "before" : "after";
          }

          return (
            <div
              className={`dynamic-card reorder-card ${kind}-card`}
              key={item.editorId}
              data-reorder-id={item.editorId}
              data-selected={selectedCardId === item.editorId || undefined}
              tabIndex={0}
              role="group"
              aria-label={`${title} ${index + 1} sur ${items.length}`}
              aria-describedby={items.length > 1 ? hintId : undefined}
              onFocusCapture={() => setSelectedCardId(item.editorId)}
              onPointerDown={event => {
                setSelectedCardId(item.editorId);
                if (event.target instanceof HTMLElement && !event.target.closest(
                  'input, textarea, select, button, a, [contenteditable]'
                )) {
                  event.currentTarget.focus({ preventScroll: true });
                }
              }}
              onKeyDown={event => moveCardWithKeyboard(event, index)}
              data-dragging={dropPreview?.draggedId === item.editorId || undefined}
              data-drop={placement}
            >
              <div className="dynamic-card-header">
                <div className="reorder-card-title">
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="reorder-handle"
                      aria-label={`${handleLabel} ${index + 1} sur ${items.length}`}
                      aria-describedby={hintId}
                      aria-keyshortcuts="ArrowUp ArrowDown"
                      title="Glisser ou utiliser les flèches haut et bas"
                      onPointerDown={(event) => startCardDrag(event, item.editorId)}
                      onPointerMove={trackCardDrag}
                      onPointerUp={finishCardDrag}
                      onPointerCancel={finishCardDrag}
                      onLostPointerCapture={finishCardDrag}
                    >
                      <span aria-hidden="true" />
                    </button>
                  )}
                  <strong>{title} {index + 1}</strong>
                </div>
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => onRemove(item.editorId)}
                >
                  <NavIcon name="trash" /> Supprimer
                </button>
              </div>
              {children(item)}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ==========================================
// APPLICATION
// ==========================================

function App({
  email = "",
  requestedSprintPage,
  onSignOut,
  onOpenDocuments,
}: {
  email?: string;
  requestedSprintPage?: { page: SprintPage };
  onSignOut?: () => void;
  onOpenDocuments?: () => void;
}) {
  const profileName = profileNameForEmail(email);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [savedData] = useState<SavedData>(loadSavedData);

  const [sprint, setSprint] = useState<Sprint>(() => ({
    ...initialSprint,
    ...savedData.sprint,
  }));

  const [releases, setReleases] = useState(() =>
    toEditableItems(
      Array.isArray(savedData.releases) ? savedData.releases : initialReleases
    )
  );

  const [tickets, setTickets] = useState(() =>
    toEditableItems(
      Array.isArray(savedData.tickets) ? savedData.tickets : initialTickets
    )
  );

  const [history, setHistory] =
    useState<SprintHistoryItem[]>(loadSprintHistory);
  const [activeTab, setActiveTab] = useState<"general" | "history">("general");
  useEffect(() => {
    if (requestedSprintPage) setActiveTab(requestedSprintPage.page);
  }, [requestedSprintPage]);

  const [copied, setCopied] = useState(false);
  const [moveNotice, setMoveNotice] = useState<CardMove | null>(null);
  const movedItems = moveNotice?.kind === "release" ? releases : tickets;
  const lastMovedIndex = movedItems.findIndex(
    ({ editorId }) => editorId === moveNotice?.id
  );

  useEffect(() => {
    if (!moveNotice) return;
    const timer = window.setTimeout(() => setMoveNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [moveNotice]);

  // ==========================================
  // SAUVEGARDE AUTOMATIQUE
  // ==========================================

  useEffect(() => {
    localStorage.setItem(
      "sprintly-data",
      JSON.stringify({
        sprint,
        releases: toSavedItems(releases),
        tickets: toSavedItems(tickets),
      })
    );
  }, [sprint, releases, tickets]);

  useEffect(() => {
    localStorage.setItem("sprintly-history", JSON.stringify(history));
  }, [history]);

  // ==========================================
  // CALCULS
  // ==========================================

  const velocitySprints = history.slice(0, 8).reverse().map((item) => ({
    id: item.id,
    name: item.sprint?.name || "Sprint",
    planned: Number(item.sprint?.plannedVelocity || 0),
    actual: Number(item.sprint?.actualVelocity || 0),
  }));
  const velocityValues = velocitySprints.flatMap(({ planned, actual }) => [
    planned,
    actual,
  ]);
  const highestVelocity = Math.max(0, ...velocityValues);
  const lowestVelocity = Math.min(0, ...velocityValues);
  const velocityRange = highestVelocity - lowestVelocity;
  const negativeIntervals =
    lowestVelocity === 0
      ? 0
      : highestVelocity === 0
        ? 4
        : Math.max(
            1,
            Math.min(3, Math.round((-lowestVelocity / velocityRange) * 4))
          );
  const positiveIntervals = 4 - negativeIntervals;
  const velocityStep = Math.max(
    1,
    Math.ceil(highestVelocity / (positiveIntervals || 1)),
    Math.ceil(-lowestVelocity / (negativeIntervals || 1))
  );
  const velocityTicks = [4, 3, 2, 1, 0].map(
    (interval) => (interval - negativeIntervals) * velocityStep
  );

  const velocityBarStyle = (points: number) => ({
    top: `${(positiveIntervals - Math.max(0, points) / velocityStep) * 25}%`,
    height: `${(Math.abs(points) / velocityStep) * 25}%`,
  });

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

  const updateRelease = (id: string, field: keyof Release, value: string) => {
    setReleases((previous) =>
      previous.map((release) =>
        release.editorId === id ? { ...release, [field]: value } : release
      )
    );
  };

  const addRelease = () => {
    const release = {
      editorId: makeId(),
      version: "",
      date: "",
      name: "",
      description: "",
      link: "",
    };
    setReleases((previous) => [...previous, release]);
    setMoveNotice(null);
  };

  const removeRelease = (id: string) => {
    setReleases((previous) => previous.filter(({ editorId }) => editorId !== id));
    setMoveNotice(null);
  };

  const updateTicket = (
    id: string,
    field: keyof Ticket,
    value: string | number
  ) => {
    setTickets((previous) =>
      previous.map((ticket) =>
        ticket.editorId === id ? { ...ticket, [field]: value } : ticket
      )
    );
  };

  const addTicket = () => {
    const ticket = { editorId: makeId(), key: "", title: "", points: 0 };
    setTickets((previous) => [...previous, ticket]);
    setMoveNotice(null);
  };

  const removeTicket = (id: string) => {
    setTickets((previous) => previous.filter(({ editorId }) => editorId !== id));
    setMoveNotice(null);
  };

  // ==========================================
  // HISTORIQUE
  // ==========================================

  const saveSprintToHistory = () => {
    const newItem: SprintHistoryItem = {
      id: makeId(),
      savedAt: new Date().toISOString(),
      sprint: { ...sprint },
      releases: toSavedItems(releases),
      tickets: toSavedItems(tickets),
    };

    setHistory((previous) => [newItem, ...previous]);
    alert(`${sprint.name} a été enregistré dans l'historique.`);
  };

  const loadSprintFromHistory = (item: SprintHistoryItem) => {
    setSprint({ ...item.sprint });
    setReleases(toEditableItems(item.releases));
    setTickets(toEditableItems(item.tickets));
    setMoveNotice(null);
    setActiveTab("general");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteSprintFromHistory = (id: string) => {
    if (!window.confirm("Supprimer ce sprint de l'historique ?")) return;
    setHistory((previous) => previous.filter((item) => item.id !== id));
  };

  const duplicateSprintFromHistory = (item: SprintHistoryItem) => {
    setSprint({ ...item.sprint, name: `${item.sprint.name} (copie)` });
    setReleases(toEditableItems(item.releases));
    setTickets(toEditableItems(item.tickets));
    setMoveNotice(null);
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
      <aside className="sidebar" aria-label="Navigation principale" data-mobile-open={navigationOpen}>
        <div className="brand">
          <img className="webwag-logo" src={webwagLogo} alt="Webwag" width={48} height={43} />
          <div className="brand-name">
            <strong>Sprintly</strong>
            <span>GESTION DES SPRINTS</span>
          </div>
          <MobileNavigation
            open={navigationOpen}
            controls="sprint-sidebar-content"
            onToggle={() => setNavigationOpen(previous => !previous)}
          />
        </div>

        <div className="sidebar-content" id="sprint-sidebar-content">
        <div className="sidebar-label">ESPACE DE TRAVAIL</div>

        {canOpenBothWorkspaces(email) ? (
          <SprintNavigation activePage={activeTab} onNavigate={setActiveTab} />
        ) : (
          <>
        <button
          type="button"
          className={`nav-item ${activeTab === "general" ? "active" : ""}`}
          aria-current={activeTab === "general" ? "page" : undefined}
          onClick={() => setActiveTab("general")}
        >
          <NavIcon name="sprint" /> Rapport de sprint
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === "history" ? "active" : ""}`}
          aria-current={activeTab === "history" ? "page" : undefined}
          onClick={() => setActiveTab("history")}
        >
          <NavIcon name="history" /> Historique des sprints
        </button>
          </>
        )}

        {onOpenDocuments && (
          <button type="button" className="nav-item" onClick={onOpenDocuments}>
            <NavIcon name="documents" /> Documents
          </button>
        )}

        <div className="sidebar-bottom profile-card">
          <div className="profile-card-heading">
            <div className="avatar">{profileName.charAt(0)}</div>
            <div className="profile-card-identity">
              <strong>{profileName}</strong>
              <span>Espace de travail</span>
            </div>
          </div>
          <ThemeSettings email={email} />
          {onSignOut && (
            <button
              type="button"
              className="button button-secondary sidebar-sign-out"
              onClick={onSignOut}
            >
              <NavIcon name="logout" />
              <span>Déconnexion</span>
            </button>
          )}
        </div>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-brand">
            <div className="breadcrumb">
              Espace de travail /{" "}
              <strong>
                {activeTab === "history" ? "Historique" : "Rapport de sprint"}
              </strong>
            </div>
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
                  {velocitySprints.length > 0 && (
                    <span className="velocity-period">
                      {velocitySprints.length === 1
                        ? "1 sprint affiché"
                        : `${velocitySprints.length} derniers sprints`}
                    </span>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="velocity-empty">
                    Enregistre un sprint pour afficher ses vélocités.
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

                    <div
                      className="velocity-chart-grid"
                      tabIndex={0}
                      role="group"
                      aria-label="Vélocités prévues et réalisées, en points"
                    >
                      {velocityTicks.map((value) => (
                        <div
                          className={`chart-grid-line${value === 0 ? " chart-grid-zero" : ""}`}
                          key={value}
                        >
                          <span>{formatPoints.format(value)} pts</span>
                          <div />
                        </div>
                      ))}

                      <div className="velocity-bars">
                        {velocitySprints.map(({ id, name, planned, actual }) => (
                          <div
                            className="velocity-bar-group"
                            key={id}
                            role="group"
                            aria-label={`${name}, prévu ${formatPoints.format(planned)} points, réalisé ${formatPoints.format(actual)} points`}
                          >
                            <div className="velocity-bar-container">
                              <div
                                className="velocity-bar planned-bar"
                                style={velocityBarStyle(planned)}
                                title={`Prévu : ${formatPoints.format(planned)} points`}
                              />
                              <div
                                className="velocity-bar actual-bar"
                                style={velocityBarStyle(actual)}
                                title={`Réalisé : ${formatPoints.format(actual)} points`}
                              />
                            </div>
                            <span className="velocity-bar-label">{name}</span>
                            <span className="velocity-bar-value">
                              {formatPoints.format(actual)} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* LISTE DES SPRINTS */}
              <section className="history-content" aria-labelledby="history-list-title">
                <header className="history-header">
                  <h2 id="history-list-title">Historique des sprints</h2>
                  <span className="history-count">
                    {history.length} sprint{history.length > 1 ? "s" : ""}
                  </span>
                </header>

                {history.length === 0 ? (
                  <div className="history-empty">
                    <h3>Aucun sprint enregistré</h3>
                    <p>
                      Clique sur « Enregistrer le rapport » pour ajouter ton
                      premier sprint à l’historique.
                    </p>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        setActiveTab("general");
                        window.scrollTo({ top: 0 });
                      }}
                    >
                      Ouvrir le rapport de sprint
                    </button>
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
                      const difference = actual - planned;
                      const performance =
                        planned > 0
                          ? Math.round((actual / planned) * 100)
                          : null;
                      const period = [
                        formatDate(item.sprint.startDate),
                        formatDate(item.sprint.endDate),
                      ]
                        .filter(Boolean)
                        .join(" — ");

                      const remaining = (item.tickets || []).reduce(
                        (total, ticket) =>
                          total + Number(ticket.points || 0),
                        0
                      );

                      return (
                        <article className="history-item" key={item.id}>
                          <div className="history-item-main">
                            <h3>{item.sprint.name || "Sprint"}</h3>
                            {period && (
                              <span className="history-item-date">{period}</span>
                            )}
                          </div>

                          <dl className="history-item-metrics">
                            <div className="history-metric">
                              <dt>Vélocité prévue</dt>
                              <dd>
                                {formatPoints.format(planned)} <small>pts</small>
                              </dd>
                            </div>
                            <div className="history-metric history-metric-actual">
                              <dt>Vélocité réalisée</dt>
                              <dd>
                                {formatPoints.format(actual)} <small>pts</small>
                              </dd>
                            </div>
                            <div
                              className="history-metric history-metric-difference"
                              data-sign={Math.sign(difference)}
                            >
                              <dt>Écart</dt>
                              <dd>
                                {formatPointDifference.format(difference)} <small>pts</small>
                              </dd>
                            </div>
                            <div className="history-metric">
                              <dt>Performance</dt>
                              <dd>
                                {performance === null ? "—" : `${performance} %`}
                              </dd>
                            </div>
                          </dl>

                          <div className="history-item-footer">
                            <div className="history-ticket-count">
                              <span>
                                {item.tickets?.length || 0} ticket{item.tickets?.length === 1 ? "" : "s"}
                                {" · "}{formatPoints.format(remaining)} pts restants
                              </span>
                              <span>
                                {item.releases?.length || 0} release{item.releases?.length === 1 ? "" : "s"}
                              </span>
                              <span>
                                Enregistré le{" "}
                                {new Date(item.savedAt).toLocaleDateString("fr-FR")}
                              </span>
                            </div>

                            <div className="history-actions">
                              <button
                                type="button"
                                className="button button-secondary history-view-button"
                                onClick={() => loadSprintFromHistory(item)}
                              >
                                <NavIcon name="view" /> Consulter
                              </button>
                              <button
                                type="button"
                                className="button history-quiet-button"
                                onClick={() =>
                                  duplicateSprintFromHistory(item)
                                }
                              >
                                <NavIcon name="duplicate" /> Dupliquer
                              </button>
                              <button
                                type="button"
                                className="button history-quiet-button history-delete-button"
                                onClick={() =>
                                  deleteSprintFromHistory(item.id)
                                }
                              >
                                <NavIcon name="trash" /> Supprimer
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
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
                  <div className="form-section compact-form-section sprint-details">
                    <div className="section-heading">
                      01 — Informations générales
                    </div>

                    <div className="sprint-details-fields">
                      <div className="field sprint-name-field">
                        <label htmlFor="sprint-name">Nom du sprint</label>
                        <input
                          id="sprint-name"
                          value={sprint.name}
                          onChange={(e) => updateSprint("name", e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="sprint-start-date">Date de début</label>
                        <input
                          id="sprint-start-date"
                          type="date"
                          value={sprint.startDate}
                          onChange={(e) =>
                            updateSprint("startDate", e.target.value)
                          }
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="sprint-end-date">Date de fin</label>
                        <input
                          id="sprint-end-date"
                          type="date"
                          value={sprint.endDate}
                          onChange={(e) =>
                            updateSprint("endDate", e.target.value)
                          }
                        />
                      </div>
                      <div className="field sprint-objectives-field">
                        <label htmlFor="sprint-objectives">Objectifs du sprint</label>
                        <textarea
                          id="sprint-objectives"
                          rows={2}
                          value={sprint.objectives}
                          onChange={(e) =>
                            updateSprint("objectives", e.target.value)
                          }
                          placeholder="Un objectif par ligne"
                        />
                      </div>
                    </div>
                  </div>

                  {/* RELEASES */}
                  <div className="form-section">
                    <div className="section-heading">02 — Releases</div>

                    <ReorderableCards
                      kind="release"
                      items={releases}
                      setItems={setReleases}
                      onMove={setMoveNotice}
                      onRemove={removeRelease}
                    >
                      {(release) => (
                        <>
                          <div className="field">
                            <label htmlFor={`release-version-${release.editorId}`}>
                              Version
                            </label>
                            <input
                              id={`release-version-${release.editorId}`}
                              value={release.version}
                              onChange={(event) =>
                                updateRelease(release.editorId, "version", event.target.value)
                              }
                            />
                          </div>

                          <div className="field">
                            <label htmlFor={`release-date-${release.editorId}`}>
                              Date
                            </label>
                            <input
                              id={`release-date-${release.editorId}`}
                              type="date"
                              value={release.date}
                              onChange={(event) =>
                                updateRelease(release.editorId, "date", event.target.value)
                              }
                            />
                          </div>

                          <div className="field">
                            <label htmlFor={`release-name-${release.editorId}`}>
                              Application
                            </label>
                            <input
                              id={`release-name-${release.editorId}`}
                              value={release.name}
                              onChange={(event) =>
                                updateRelease(release.editorId, "name", event.target.value)
                              }
                            />
                          </div>

                          <div className="field release-description">
                            <label htmlFor={`release-description-${release.editorId}`}>
                              Description de la release
                            </label>
                            <input
                              id={`release-description-${release.editorId}`}
                              value={release.description}
                              onChange={(event) =>
                                updateRelease(release.editorId, "description", event.target.value)
                              }
                            />
                          </div>

                          <div className="field release-link">
                            <label htmlFor={`release-link-${release.editorId}`}>
                              Lien Jira
                            </label>
                            <input
                              id={`release-link-${release.editorId}`}
                              placeholder="https://..."
                              value={release.link}
                              onChange={(event) =>
                                updateRelease(release.editorId, "link", event.target.value)
                              }
                            />
                          </div>
                        </>
                      )}
                    </ReorderableCards>

                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={addRelease}
                    >
                      + Ajouter une release
                    </button>
                  </div>

                  {/* INDICATEURS DE VÉLOCITÉ */}
                  <div className="form-section compact-form-section">
                    <div className="section-heading">
                      03 — Indicateurs de vélocité
                    </div>

                    <div className="field-row velocity-input-pair">
                      <div className="field">
                        <label htmlFor="planned-velocity">Vélocité prévue (points)</label>
                        <input
                          id="planned-velocity"
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
                        <label htmlFor="actual-velocity">Vélocité réelle (points)</label>
                        <input
                          id="actual-velocity"
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

                    <table className="velocity-input-table" aria-label="Tickets et points par catégorie">
                      <thead>
                        <tr>
                          <td />
                          <th scope="col" id="velocity-ticket-column">Tickets</th>
                          <th scope="col" id="velocity-point-column">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {([
                          ["Au démarrage", "startTickets", "startPoints"],
                          ["Ajoutés", "addedTickets", "addedPoints"],
                          ["Réestimés", "reestimatedTickets", "reestimatedPoints"],
                        ] as const).map(([label, ticketField, pointField]) => (
                          <tr key={ticketField}>
                            <th scope="row" id={`velocity-${ticketField}-row`}>
                              {label}
                            </th>
                            <td>
                              <input
                                type="number"
                                aria-labelledby={`velocity-ticket-column velocity-${ticketField}-row`}
                                value={sprint[ticketField] || ""}
                                placeholder="0"
                                onChange={(e) =>
                                  updateSprint(ticketField, Number(e.target.value))
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                aria-labelledby={`velocity-point-column velocity-${ticketField}-row`}
                                value={sprint[pointField] || ""}
                                placeholder="0"
                                onChange={(e) =>
                                  updateSprint(pointField, Number(e.target.value))
                                }
                              />
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <th scope="row" id="velocity-bugs-row">Bugs</th>
                          <td />
                          <td>
                            <input
                              type="number"
                              aria-labelledby="velocity-point-column velocity-bugs-row"
                              value={sprint.bugPoints || ""}
                              placeholder="0"
                              onChange={(e) =>
                                updateSprint("bugPoints", Number(e.target.value))
                              }
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* TICKETS RESTANTS */}
                  <div className="form-section">
                    <div className="section-heading">
                      04 — Tickets restants
                    </div>

                    <ReorderableCards
                      kind="ticket"
                      items={tickets}
                      setItems={setTickets}
                      onMove={setMoveNotice}
                      onRemove={removeTicket}
                    >
                      {(ticket) => (
                        <>
                          <div className="field">
                            <label htmlFor={`ticket-key-${ticket.editorId}`}>Clé Jira</label>
                            <input
                              id={`ticket-key-${ticket.editorId}`}
                              value={ticket.key}
                              onChange={(e) =>
                                updateTicket(ticket.editorId, "key", e.target.value)
                              }
                            />
                          </div>

                          <div className="field">
                            <label htmlFor={`ticket-points-${ticket.editorId}`}>
                              Points d’effort
                            </label>
                            <input
                              id={`ticket-points-${ticket.editorId}`}
                              type="number"
                              value={ticket.points || ""}
                              placeholder="0"
                              onChange={(e) =>
                                updateTicket(ticket.editorId, "points", Number(e.target.value))
                              }
                            />
                          </div>

                          <div className="field ticket-description">
                            <label htmlFor={`ticket-title-${ticket.editorId}`}>
                              Description
                            </label>
                            <input
                              id={`ticket-title-${ticket.editorId}`}
                              value={ticket.title}
                              onChange={(e) =>
                                updateTicket(ticket.editorId, "title", e.target.value)
                              }
                            />
                          </div>
                        </>
                      )}
                    </ReorderableCards>

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
                <section className="preview-panel" aria-labelledby="preview-title">
                  <div className="panel-header preview-header">
                    <h2 id="preview-title">Aperçu du rapport</h2>
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
                  </div>

                  <div className="email-preview">
                    <div
                      className="email-body"
                      tabIndex={0}
                      role="region"
                      aria-label={`Rapport de ${sprint.name || "sprint"}`}
                    >
                      <div
                        className="html-email-preview"
                        dangerouslySetInnerHTML={{ __html: generateReport() }}
                      />
                    </div>
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

          <div role="status">
            {moveNotice && activeTab === "general" && lastMovedIndex !== -1 && (
              <div className="card-move-toast">
                <span className="card-move-toast-icon" aria-hidden="true">✓</span>
                {moveNotice.kind === "release"
                  ? "Release déplacée avec succès"
                  : "Ticket déplacé avec succès"}
                <span className="card-screen-reader-text">
                  {` Position ${lastMovedIndex + 1} sur ${movedItems.length}.`}
                </span>
              </div>
            )}
          </div>

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
