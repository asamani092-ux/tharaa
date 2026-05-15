export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "ds-theme";

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  }
}

export function getStoredTheme(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" ? "light" : "dark";
}

export function setStoredTheme(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  applyTheme(mode);
}

export function isDarkTheme(): boolean {
  const root = document.documentElement;
  return root.classList.contains("dark") || root.getAttribute("data-theme") === "dark";
}
