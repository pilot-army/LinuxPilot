import {
  MAX_SERVER_TAGS,
  SERVER_TAG_PATTERN,
  SPACE_NAME_MAX,
  SPACE_SLUG_MAX,
  isReservedSpaceSlug,
  slugifySpaceName,
  type GroupColorToken,
  type ServerSpaceIcon,
} from '@linuxpilot/server-contracts';

export const SPACE_DESCRIPTION_UI_MAX = 200;
export const DEFAULT_SPACE_ICON: ServerSpaceIcon = 'server';
export const DEFAULT_SPACE_COLOR: GroupColorToken = 'cyan';

export type CreateSpaceFormValue = {
  name: string;
  slug: string;
  slugManual: boolean;
  description: string;
  icon: ServerSpaceIcon;
  color: GroupColorToken;
  tags: string[];
};

export const EMPTY_CREATE_SPACE_FORM: CreateSpaceFormValue = {
  name: '',
  slug: '',
  slugManual: false,
  description: '',
  icon: DEFAULT_SPACE_ICON,
  color: DEFAULT_SPACE_COLOR,
  tags: [],
};

const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,79}$/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CreateSpaceFormCopy = {
  nameRequired: string;
  nameInvalid: string;
  nameTaken: string;
  slugInvalid: string;
  slugTaken: string;
  slugReserved: string;
  descriptionLimit: string;
  tagInvalid: string;
  tagsLimit: string;
};

export type CreateSpaceFieldErrors = Partial<
  Record<'name' | 'slug' | 'description' | 'tags', string>
>;

export function nextSlugFromName(name: string, slugManual: boolean, currentSlug: string): string {
  if (slugManual) {
    return currentSlug;
  }
  return name.trim() ? slugifySpaceName(name) : '';
}

export function isCreateSpaceFormDirty(value: CreateSpaceFormValue): boolean {
  return (
    value.name.trim() !== '' ||
    value.slugManual ||
    value.description.trim() !== '' ||
    value.tags.length > 0 ||
    value.icon !== DEFAULT_SPACE_ICON ||
    value.color !== DEFAULT_SPACE_COLOR
  );
}

export function normalizeSpaceTag(raw: string): string {
  return raw.trim().replace(/\s+/g, '-').toLowerCase();
}

export function parseSpaceTag(raw: string): { tag?: string; invalid?: boolean } {
  const tag = normalizeSpaceTag(raw);
  if (!tag) {
    return {};
  }
  if (!SERVER_TAG_PATTERN.test(tag) || tag.length > 32) {
    return { invalid: true };
  }
  return { tag };
}

export function addSpaceTags(
  current: string[],
  raw: string,
): { tags: string[]; invalid?: boolean; limit?: boolean } {
  const chunks = raw.split(',').map((item) => item.trim());
  const next = [...current];
  let invalid = false;
  let limit = false;
  for (const chunk of chunks) {
    if (!chunk) {
      continue;
    }
    const parsed = parseSpaceTag(chunk);
    if (parsed.invalid) {
      invalid = true;
      continue;
    }
    if (!parsed.tag || next.includes(parsed.tag)) {
      continue;
    }
    if (next.length >= MAX_SERVER_TAGS) {
      limit = true;
      break;
    }
    next.push(parsed.tag);
  }
  return { tags: next, invalid: invalid || undefined, limit: limit || undefined };
}

export function validateCreateSpaceForm(
  value: CreateSpaceFormValue,
  copy: CreateSpaceFormCopy,
  existingNames: string[],
  existingSlugs: string[],
): CreateSpaceFieldErrors {
  const errors: CreateSpaceFieldErrors = {};
  const name = value.name.trim();
  if (!name) {
    errors.name = copy.nameRequired;
  } else if (name.length > SPACE_NAME_MAX || !NAME_PATTERN.test(name)) {
    errors.name = copy.nameInvalid;
  } else if (existingNames.some((item) => item.trim().toLowerCase() === name.toLowerCase())) {
    errors.name = copy.nameTaken;
  }

  const slug = value.slug.trim().toLowerCase() || (name ? slugifySpaceName(name) : '');
  if (slug) {
    if (slug.length > SPACE_SLUG_MAX || !SLUG_PATTERN.test(slug)) {
      errors.slug = copy.slugInvalid;
    } else if (isReservedSpaceSlug(slug)) {
      errors.slug = copy.slugReserved;
    } else if (existingSlugs.some((item) => item.trim().toLowerCase() === slug)) {
      errors.slug = copy.slugTaken;
    }
  }

  if (value.description.length > SPACE_DESCRIPTION_UI_MAX) {
    errors.description = copy.descriptionLimit;
  }

  return errors;
}

export function isCreateSpaceFormValid(
  value: CreateSpaceFormValue,
  existingNames: string[],
  existingSlugs: string[],
): boolean {
  const copy: CreateSpaceFormCopy = {
    nameRequired: 'x',
    nameInvalid: 'x',
    nameTaken: 'x',
    slugInvalid: 'x',
    slugTaken: 'x',
    slugReserved: 'x',
    descriptionLimit: 'x',
    tagInvalid: 'x',
    tagsLimit: 'x',
  };
  return (
    Object.keys(validateCreateSpaceForm(value, copy, existingNames, existingSlugs)).length === 0
  );
}

export function mapCreateSpaceApiError(
  status: number,
  code: string,
  message: string,
  copy: {
    nameTaken: string;
    slugTaken: string;
    slugReserved: string;
    forbidden: string;
    networkError: string;
    timeout: string;
    validationError: string;
    createFailed: string;
  },
): { field?: keyof CreateSpaceFieldErrors; message: string } {
  const lower = message.toLowerCase();
  if (status === 0 || code === 'NETWORK_ERROR') {
    return { message: copy.networkError };
  }
  if (status === 403 || code === 'AUTH_FORBIDDEN') {
    return { message: copy.forbidden };
  }
  if (
    status === 408 ||
    status === 504 ||
    code === 'GATEWAY_UNAVAILABLE' ||
    lower.includes('timeout')
  ) {
    return { message: copy.timeout };
  }
  if (status === 409 && lower.includes('slug')) {
    return { field: 'slug', message: copy.slugTaken };
  }
  if (status === 409) {
    return { field: 'name', message: copy.nameTaken };
  }
  if (status === 400 && lower.includes('reserved')) {
    return { field: 'slug', message: copy.slugReserved };
  }
  if (status === 400 || code === 'VALIDATION_ERROR') {
    return { message: copy.validationError };
  }
  return { message: copy.createFailed };
}
