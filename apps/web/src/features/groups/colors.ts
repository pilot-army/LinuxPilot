import { GROUP_COLOR_TOKENS, type GroupColorToken } from '@linuxpilot/server-contracts';

export const GROUP_COLOR_ORDER: GroupColorToken[] = [
  'blue',
  'cyan',
  'green',
  'violet',
  'amber',
  'red',
  'gray',
];

export const SPACE_COLOR_ORDER: GroupColorToken[] = [
  'cyan',
  'blue',
  'green',
  'violet',
  'amber',
  'red',
  'gray',
];

export function hexToGroupToken(hex: string): GroupColorToken {
  const normalized = hex.trim().toLowerCase();
  const match = (Object.entries(GROUP_COLOR_TOKENS) as [GroupColorToken, string][]).find(
    ([, value]) => value.toLowerCase() === normalized,
  );
  return match?.[0] ?? 'blue';
}

export function groupColorHex(token: GroupColorToken | string): string {
  if (token in GROUP_COLOR_TOKENS) {
    return GROUP_COLOR_TOKENS[token as GroupColorToken];
  }
  return token.startsWith('#') ? token : GROUP_COLOR_TOKENS.blue;
}
