import { describe, expect, it } from 'vitest';
import { emptyForm } from './types';
import {
  canAddTag,
  canContinueStep3,
  generateRandomHostname,
  hostnameLooksCustom,
  isFormDirty,
  parseTagCandidate,
  toCreatePayload,
  validateAddress,
  validateHostname,
  validateName,
  validatePrimaryIp,
  validateSshPort,
  validateStep1,
} from './validation';

const copy = {
  nameRequired: 'name-required',
  nameLength: 'name-length',
  nameChars: 'name-chars',
  nameTaken: 'name-taken',
  hostnameInvalid: 'hostname-invalid',
  primaryIpInvalid: 'primary-ip-invalid',
  addressRequired: 'address-required',
  sshPortInvalid: 'ssh-port-invalid',
  sshUserRequired: 'ssh-user-required',
  descriptionLimit: 'description-limit',
  tagInvalid: 'tag-invalid',
  tagsLimit: 'tags-limit',
};

describe('enrollment validation', () => {
  it('requires a trimmed name', () => {
    expect(validateName('   ', copy)).toBe(copy.nameRequired);
    expect(validateName('edge-01', copy)).toBeUndefined();
  });

  it('rejects names that are too long or use invalid characters', () => {
    expect(validateName('a'.repeat(81), copy)).toBe(copy.nameLength);
    expect(validateName('bad/name', copy)).toBe(copy.nameChars);
  });

  it('allows an empty hostname and validates a filled one', () => {
    expect(validateHostname('', copy)).toBeUndefined();
    expect(validateHostname('prod-web-01', copy)).toBeUndefined();
    expect(validateHostname('-bad', copy)).toBe(copy.hostnameInvalid);
  });

  it('allows an empty IP and validates a filled one', () => {
    expect(validatePrimaryIp('', copy)).toBeUndefined();
    expect(validatePrimaryIp('10.0.1.24', copy)).toBeUndefined();
    expect(validatePrimaryIp('not-an-ip', copy)).toBe(copy.primaryIpInvalid);
  });

  it('limits description to 240 characters', () => {
    const form = { ...emptyForm(), name: 'edge-01', description: 'x'.repeat(241) };
    expect(validateStep1(form, copy).description).toBe(copy.descriptionLimit);
  });

  it('normalizes and limits tags', () => {
    expect(parseTagCandidate(' Prod Web ', copy).tag).toBe('prod-web');
    expect(
      canAddTag(
        Array.from({ length: 16 }, (_, index) => `t${index}`),
        'extra',
        copy,
      ),
    ).toBe(copy.tagsLimit);
  });

  it('detects dirty forms', () => {
    expect(isFormDirty(emptyForm(), emptyForm())).toBe(false);
    expect(isFormDirty({ ...emptyForm(), name: 'a' }, emptyForm())).toBe(true);
  });

  it('generates a random valid hostname independent of the server name', () => {
    const first = generateRandomHostname(() => Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]));
    const second = generateRandomHostname(() => Uint8Array.from([9, 10, 11, 12, 13, 14, 15, 16]));
    expect(first).toMatch(/^[a-z]{4}-[a-z]{4}$/);
    expect(second).toMatch(/^[a-z]{4}-[a-z]{4}$/);
    expect(first).not.toBe(second);
    expect(first.startsWith('node-')).toBe(false);
    expect(validateHostname(first, copy)).toBeUndefined();
    expect(validateHostname(generateRandomHostname(), copy)).toBeUndefined();
  });

  it('allows auto-detect by default and omits fake system fields from the payload', () => {
    const form = emptyForm();
    expect(form.detectAutomatically).toBe(true);
    expect(canContinueStep3(form)).toBe(true);
    expect(toCreatePayload(form)).toEqual({
      name: '',
      description: '',
      hostname: undefined,
      spaceId: undefined,
      tags: [],
      autoDetectSystem: true,
    });
  });

  it('requires a distribution and architecture in manual mode', () => {
    const form = { ...emptyForm(), detectAutomatically: false };
    expect(canContinueStep3(form)).toBe(false);
    expect(canContinueStep3({ ...form, distribution: 'debian' })).toBe(false);
    expect(canContinueStep3({ ...form, distribution: 'debian', architecture: 'arm64' })).toBe(true);
    expect(
      toCreatePayload({
        ...form,
        name: 'edge-01',
        distribution: 'debian',
        osVersion: '12',
        architecture: 'arm64',
      }),
    ).toEqual({
      name: 'edge-01',
      description: '',
      hostname: undefined,
      spaceId: undefined,
      tags: [],
      autoDetectSystem: false,
      osName: 'debian',
      osVersion: '12',
      architecture: 'arm64',
    });
  });

  it('keeps the OS version optional in manual mode', () => {
    const form = {
      ...emptyForm(),
      detectAutomatically: false,
      distribution: 'ubuntu' as const,
      architecture: 'amd64' as const,
    };
    expect(canContinueStep3(form)).toBe(true);
    expect(toCreatePayload({ ...form, name: 'edge-01' }).osVersion).toBeUndefined();
  });

  it('includes a filled IP in the create payload', () => {
    expect(
      toCreatePayload({
        ...emptyForm(),
        name: 'edge-01',
        address: '10.0.1.24',
        primaryIp: '10.0.1.24',
        spaceId: 'space-prod',
        tags: ['web'],
      }),
    ).toEqual(
      expect.objectContaining({
        name: 'edge-01',
        primaryIp: '10.0.1.24',
        spaceId: 'space-prod',
        tags: ['web'],
      }),
    );
  });

  it('validates IPv4, IPv6, hostname, and rejects an empty address', () => {
    expect(validateAddress('', copy)).toBe(copy.addressRequired);
    expect(validateAddress('10.0.1.24', copy)).toBeUndefined();
    expect(validateAddress('2001:db8::1', copy)).toBeUndefined();
    expect(validateAddress('web.example.com', copy)).toBeUndefined();
    expect(validateAddress('-bad', copy)).toBe(copy.hostnameInvalid);
    expect(validateSshPort('22', copy)).toBeUndefined();
    expect(validateSshPort('70000', copy)).toBe(copy.sshPortInvalid);
  });

  it('treats a hostname as custom when it differs from the last generated value', () => {
    expect(hostnameLooksCustom('', 'kqmt-plxv')).toBe(false);
    expect(hostnameLooksCustom('kqmt-plxv', 'kqmt-plxv')).toBe(false);
    expect(hostnameLooksCustom('custom-host', 'kqmt-plxv')).toBe(true);
  });
});
