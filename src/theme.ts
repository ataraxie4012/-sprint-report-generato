export const defaultAccent = "#6258e8";
const storageKey = "sprintly-accent";
const savedColorsKey = "sprintly-saved-hex-colors";
let savedColors: string[] = [];
let accent = defaultAccent;
export type ThemeMode = "light" | "dark";
const modeStorageKey = "sprintly-theme-mode";
let mode: ThemeMode = "light";

export function getThemeMode() { return mode; }

function applyThemeMode(nextMode: ThemeMode) {
  mode = nextMode;
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
  listeners.forEach(listener => listener());
}

export function setThemeMode(nextMode: ThemeMode) {
  applyThemeMode(nextMode);
  try {
    localStorage.setItem(modeStorageKey, nextMode);
    return true;
  } catch {
    return false;
  }
}

const listeners = new Set<() => void>();
const validColor = (color: string) => /^#[0-9a-f]{6}$/i.test(color);

export function getAccent() { return accent; }
export function getSavedColors() { return savedColors; }

function readSavedColors(): string[] {
  const raw = localStorage.getItem(savedColorsKey);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return [...new Set(parsed.filter(
    (value): value is string => typeof value === "string" && validColor(value)
  ).map(value => value.toLowerCase()))];
}

export function subscribeAccent(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function applyAccent(color: string) {
  accent = color;
  const rgb = [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16));
  const mixWhite = (white: number) => "#" + rgb.map(value =>
    Math.round(value * (1 - white) + 255 * white).toString(16).padStart(2, "0")
  ).join("");
  const luminanceFor = (channels: number[]) => channels.map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const luminance = luminanceFor(rgb);
  let darkChannels = rgb.map(value => Math.round(value * 0.65));
  while (luminanceFor(darkChannels) > 0.14) {
    darkChannels = darkChannels.map(value => Math.floor(value * 0.85));
  }
  const dark = "#" + darkChannels.map(value => value.toString(16).padStart(2, "0")).join("");
  const vars = {
    "--primary": color,
    "--primary-dark": dark,
    "--primary-light": mixWhite(0.9),
    "--primary-soft": mixWhite(0.96),
    "--primary-border": mixWhite(0.75),
    "--primary-contrast": luminance > 0.179 ? "#171717" : "#ffffff",
    "--primary-rgb": rgb.join(", "),
    "--shadow-primary": `0 4px 12px rgba(${rgb.join(", ")}, 0.2)`,
  };
  for (const [name, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(name, value);
  }
  listeners.forEach(listener => listener());
}

export function initializeTheme() {
  try {
    applyThemeMode(localStorage.getItem(modeStorageKey) === "dark" ? "dark" : "light");
  } catch {
    applyThemeMode("light");
  }
  try {
    const saved = localStorage.getItem(storageKey);
    try {
      savedColors = readSavedColors();
      if (!localStorage.getItem(savedColorsKey) && saved && validColor(saved)) {
        savedColors = [saved.toLowerCase()];
      }
    } catch {
      savedColors = [];
    }
    applyAccent(saved && validColor(saved) ? saved : defaultAccent);
  } catch {
    applyAccent(defaultAccent);
  }
  window.addEventListener("storage", event => {
    if (event.key === modeStorageKey || event.key === null) {
      applyThemeMode(event.newValue === "dark" ? "dark" : "light");
    }
    if (event.key === savedColorsKey || event.key === null) {
      try { savedColors = readSavedColors(); } catch { savedColors = []; }
      listeners.forEach(listener => listener());
    }
    if (event.key === storageKey || event.key === null) {
      applyAccent(event.newValue && validColor(event.newValue) ? event.newValue : defaultAccent);
    }
  });
}

export function setAccent(color: string) {
  if (!validColor(color)) return false;
  applyAccent(color);
  try {
    localStorage.setItem(storageKey, color);
    return true;
  } catch {
    return false;
  }
}

export function saveHexAccent(color: string) {
  if (!validColor(color)) return false;
  const normalized = color.toLowerCase();
  const accentSaved = setAccent(normalized);
  try {
    const previousColors = readSavedColors();
    const nextColors = [...new Set([...previousColors, ...savedColors, normalized])];
    localStorage.setItem(savedColorsKey, JSON.stringify(nextColors));
    savedColors = nextColors;
    listeners.forEach(listener => listener());
    return accentSaved;
  } catch {
    return false;
  }
}
