export const SPACE_DETAIL_TABS = [
  'overview',
  'servers',
  'alerts',
  'settings',
  'activity',
] as const;

export type SpaceDetailTab = (typeof SPACE_DETAIL_TABS)[number];

export function isSpaceDetailTab(value: string | undefined): value is SpaceDetailTab {
  return SPACE_DETAIL_TABS.includes(value as SpaceDetailTab);
}

export function spaceSlugOf(space: { id: string; slug?: string | null }): string {
  return space.slug?.trim() || space.id;
}

export function spacePath(
  space: { id: string; slug?: string | null },
  tab: SpaceDetailTab = 'servers',
): string {
  const slug = spaceSlugOf(space);
  if (tab === 'servers') {
    return `/server-spaces/${slug}`;
  }
  return `/server-spaces/${slug}/${tab}`;
}

export const SPACES_SCROLL_KEY = 'linuxpilot.spaces.scrollY';
