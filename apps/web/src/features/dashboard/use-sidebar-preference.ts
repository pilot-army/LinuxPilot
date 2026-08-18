export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'linuxpilot.sidebar.collapsed';
export const SIDEBAR_EXPANDED_STORAGE_KEY = 'linuxpilot.sidebar.expanded';
export const DEFAULT_EXPANDED_GROUPS = ['servers'];

export function readSidebarCollapsed(): boolean | null {
  try {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (stored === 'true') {
      return true;
    }
    if (stored === 'false') {
      return false;
    }
  } catch {
    // Ignore quota / private-mode failures.
  }
  return null;
}

export function persistSidebarCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? 'true' : 'false');
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function readSidebarExpanded(fallback: string[] = DEFAULT_EXPANDED_GROUPS): string[] {
  try {
    const stored = window.localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY);
    if (!stored) {
      return fallback;
    }
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed;
    }
  } catch {
    // Ignore quota / private-mode failures.
  }
  return fallback;
}

export function persistSidebarExpanded(ids: string[]) {
  try {
    window.localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore quota / private-mode failures.
  }
}
