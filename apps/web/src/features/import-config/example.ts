import { stringify } from 'yaml';
import { EXAMPLE_IMPORT_DOCUMENT } from './constants';

export function exampleYaml(): string {
  return stringify(EXAMPLE_IMPORT_DOCUMENT, { indent: 2 }).trimEnd() + '\n';
}

export function exampleJson(): string {
  return `${JSON.stringify(EXAMPLE_IMPORT_DOCUMENT, null, 2)}\n`;
}

export function isIpv4(value: string): boolean {
  return /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(
    value,
  );
}

export function isIp(value: string): boolean {
  if (isIpv4(value)) {
    return true;
  }
  return value.includes(':') && value.length <= 45 && !/[^0-9a-fA-F:]/.test(value);
}

export function isUnsafeHost(value: string): boolean {
  return /:\/\//.test(value) || value.includes('/') || value.includes('?') || value.includes('#');
}

export function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

export function extensionOf(name: string): string {
  const match = name
    .trim()
    .toLowerCase()
    .match(/(\.[a-z0-9]+)$/);
  return match?.[1] ?? '';
}

export function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${Math.round(value / 102.4) / 10} KB`;
  }
  return `${Math.round(value / (1024 * 102.4)) / 10} MB`;
}
