export const STORAGE_KEY = "bt.apps.v1";

export function loadApps() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveApps(apps) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}