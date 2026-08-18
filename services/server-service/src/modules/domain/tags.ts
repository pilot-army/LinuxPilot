import { MAX_SERVER_TAGS, SERVER_TAG_PATTERN } from '@linuxpilot/server-contracts';

export function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeTags(values: string[]): string[] {
  const unique: string[] = [];
  for (const value of values) {
    const tag = normalizeTag(value);
    if (!tag || !SERVER_TAG_PATTERN.test(tag)) {
      continue;
    }
    if (!unique.includes(tag)) {
      unique.push(tag);
    }
    if (unique.length >= MAX_SERVER_TAGS) {
      break;
    }
  }
  return unique;
}

export function mergeTags(current: string[], incoming: string[]): string[] {
  return normalizeTags([...current, ...incoming]);
}

export function removeTags(current: string[], incoming: string[]): string[] {
  const blocked = new Set(incoming.map(normalizeTag));
  return current.filter((tag) => !blocked.has(normalizeTag(tag)));
}
