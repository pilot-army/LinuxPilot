import { optionalIpSchema, SERVER_TAG_PATTERN } from '@linuxpilot/server-contracts';
import {
  DESCRIPTION_MAX,
  HOSTNAME_MAX,
  MAX_TAGS,
  NAME_MAX,
  NAME_MIN,
  OS_VERSION_MAX,
  SSH_PORT_MAX,
  SSH_PORT_MIN,
} from './constants';
import type { CheckState, FieldErrors, WizardForm } from './types';

const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u;
const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

export type WizardCopy = {
  nameRequired: string;
  nameLength: string;
  nameChars: string;
  nameTaken: string;
  hostnameInvalid: string;
  primaryIpInvalid: string;
  addressRequired: string;
  sshPortInvalid: string;
  sshUserRequired: string;
  descriptionLimit: string;
  tagInvalid: string;
  tagsLimit: string;
};

export function validateName(value: string, copy: WizardCopy): string | undefined {
  const name = value.trim();
  if (!name) {
    return copy.nameRequired;
  }
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return copy.nameLength;
  }
  if (!NAME_PATTERN.test(name)) {
    return copy.nameChars;
  }
  return undefined;
}

const HOSTNAME_LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const RANDOM_HOSTNAME_PART_LENGTH = 4;

function randomToken(randomBytes: (size: number) => Uint8Array, length: number): string {
  const bytes = randomBytes(length);
  let token = '';
  for (let index = 0; index < length; index += 1) {
    const byte = bytes[index] ?? bytes[index % Math.max(bytes.length, 1)] ?? 0;
    token += HOSTNAME_LETTERS[byte % HOSTNAME_LETTERS.length];
  }
  return token;
}

export function generateRandomHostname(
  randomBytes: (size: number) => Uint8Array = (size) => {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return bytes;
  },
): string {
  const left = randomToken(randomBytes, RANDOM_HOSTNAME_PART_LENGTH);
  const right = randomToken(randomBytes, RANDOM_HOSTNAME_PART_LENGTH);
  return `${left}-${right}`;
}

export function hostnameLooksCustom(hostname: string, lastGenerated: string): boolean {
  const current = hostname.trim();
  if (!current) {
    return false;
  }
  return current !== lastGenerated;
}

export function validateHostname(value: string, copy: WizardCopy): string | undefined {
  const hostname = value.trim();
  if (!hostname) {
    return undefined;
  }
  if (hostname.length > HOSTNAME_MAX || !HOSTNAME_PATTERN.test(hostname)) {
    return copy.hostnameInvalid;
  }
  return undefined;
}

export function applyAddress(address: string): { hostname: string; primaryIp: string } {
  const value = address.trim();
  if (!value) {
    return { hostname: '', primaryIp: '' };
  }
  if (optionalIpSchema.safeParse(value).success) {
    return { hostname: '', primaryIp: value };
  }
  return { hostname: value, primaryIp: '' };
}

export function validateAddress(value: string, copy: WizardCopy): string | undefined {
  const address = value.trim();
  if (!address) {
    return copy.addressRequired;
  }
  if (optionalIpSchema.safeParse(address).success) {
    return undefined;
  }
  return validateHostname(address, copy);
}

export function validatePrimaryIp(value: string, copy: WizardCopy): string | undefined {
  const ip = value.trim();
  if (!ip) {
    return undefined;
  }
  return optionalIpSchema.safeParse(ip).success ? undefined : copy.primaryIpInvalid;
}

export function validateSshPort(value: string, copy: WizardCopy): string | undefined {
  if (!/^\d+$/.test(value.trim())) {
    return copy.sshPortInvalid;
  }
  const port = Number(value.trim());
  if (port < SSH_PORT_MIN || port > SSH_PORT_MAX) {
    return copy.sshPortInvalid;
  }
  return undefined;
}

export function validateSshUser(value: string, copy: WizardCopy): string | undefined {
  return value.trim() ? undefined : copy.sshUserRequired;
}

export function validateDescription(value: string, copy: WizardCopy): string | undefined {
  if (value.length > DESCRIPTION_MAX) {
    return copy.descriptionLimit;
  }
  return undefined;
}

export function validateOsVersion(value: string): string | undefined {
  if (value.trim().length > OS_VERSION_MAX) {
    return 'osVersion';
  }
  return undefined;
}

export function normalizeTag(value: string): string {
  return value.trim().replace(/\s+/g, '-').toLowerCase();
}

export function validateTag(value: string, copy: WizardCopy): string | undefined {
  if (!SERVER_TAG_PATTERN.test(value)) {
    return copy.tagInvalid;
  }
  return undefined;
}

export function parseTagCandidate(raw: string, copy: WizardCopy): { tag?: string; error?: string } {
  const tag = normalizeTag(raw);
  if (!tag) {
    return {};
  }
  const error = validateTag(tag, copy);
  if (error) {
    return { error };
  }
  return { tag };
}

export function canAddTag(tags: string[], candidate: string, copy: WizardCopy): string | undefined {
  if (tags.includes(candidate)) {
    return undefined;
  }
  if (tags.length >= MAX_TAGS) {
    return copy.tagsLimit;
  }
  return validateTag(candidate, copy);
}

export function validateStep1(form: WizardForm, copy: WizardCopy): FieldErrors {
  const errors: FieldErrors = {};
  const nameError = validateName(form.name, copy);
  const addressError = validateAddress(form.address, copy);
  const descriptionError = validateDescription(form.description, copy);
  if (nameError) {
    errors.name = nameError;
  }
  if (addressError) {
    errors.address = addressError;
  }
  if (descriptionError) {
    errors.description = descriptionError;
  }
  return errors;
}

export function validateStep2(form: WizardForm, copy: WizardCopy): FieldErrors {
  const errors: FieldErrors = {};
  const portError = validateSshPort(form.sshPort, copy);
  const userError = validateSshUser(form.sshUser, copy);
  if (portError) {
    errors.sshPort = portError;
  }
  if (userError) {
    errors.sshUser = userError;
  }
  return errors;
}

export function canContinueStep1(form: WizardForm, copy: WizardCopy): boolean {
  return Object.keys(validateStep1(form, copy)).length === 0;
}

export function canContinueStep2(form: WizardForm, copy: WizardCopy): boolean {
  return Object.keys(validateStep2(form, copy)).length === 0;
}

export function isFormDirty(form: WizardForm, baseline: WizardForm): boolean {
  return (
    form.name !== baseline.name ||
    form.address !== baseline.address ||
    form.hostname !== baseline.hostname ||
    form.primaryIp !== baseline.primaryIp ||
    form.description !== baseline.description ||
    form.spaceId !== baseline.spaceId ||
    form.tags.join('\0') !== baseline.tags.join('\0') ||
    form.sshPort !== baseline.sshPort ||
    form.sshUser !== baseline.sshUser ||
    form.useSudo !== baseline.useSudo ||
    form.fingerprintCheck !== baseline.fingerprintCheck ||
    form.installMode !== baseline.installMode ||
    form.confirmNoAgent !== baseline.confirmNoAgent
  );
}

export function canContinueStep3(form: WizardForm): boolean {
  if (form.detectAutomatically) {
    return true;
  }
  return Boolean(form.distribution && form.architecture);
}

export function canContinueAgentStep(form: WizardForm, compatCheck: CheckState): boolean {
  if (compatCheck === 'error' || compatCheck === 'testing') {
    return false;
  }
  if (form.installMode === 'none') {
    return form.confirmNoAgent;
  }
  return true;
}

export function canContinueConnection(
  form: WizardForm,
  copy: WizardCopy,
  connectionCheck: CheckState,
): boolean {
  if (!canContinueStep2(form, copy)) {
    return false;
  }
  return connectionCheck === 'success' || connectionCheck === 'warning';
}

export type EnrollmentCreatePayload = {
  name: string;
  description: string;
  hostname?: string;
  primaryIp?: string;
  spaceId?: string;
  tags: string[];
  autoDetectSystem: boolean;
  osName?: string;
  osVersion?: string;
  architecture?: 'amd64' | 'arm64';
  sshKeyId?: string;
};

export function toCreatePayload(form: WizardForm): EnrollmentCreatePayload {
  const resolved = applyAddress(form.address);
  const hostname = resolved.hostname || form.hostname.trim();
  const primaryIp = resolved.primaryIp || form.primaryIp.trim();
  if (form.detectAutomatically) {
    return {
      name: form.name.trim(),
      description: form.description.trim(),
      hostname: hostname || undefined,
      ...(primaryIp ? { primaryIp } : {}),
      spaceId: form.spaceId || undefined,
      tags: form.tags,
      autoDetectSystem: true,
      ...(form.sshKeyId ? { sshKeyId: form.sshKeyId } : {}),
    };
  }
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    hostname: hostname || undefined,
    ...(primaryIp ? { primaryIp } : {}),
    spaceId: form.spaceId || undefined,
    tags: form.tags,
    autoDetectSystem: false,
    ...(form.sshKeyId ? { sshKeyId: form.sshKeyId } : {}),
    osName: form.distribution || undefined,
    osVersion: form.osVersion.trim() || undefined,
    architecture: form.architecture || undefined,
  };
}
