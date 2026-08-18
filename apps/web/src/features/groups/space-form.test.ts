import { describe, expect, it } from 'vitest';
import { slugifySpaceName } from '@linuxpilot/server-contracts';
import {
  addSpaceTags,
  isCreateSpaceFormDirty,
  EMPTY_CREATE_SPACE_FORM,
  nextSlugFromName,
  validateCreateSpaceForm,
} from './space-form';

const copy = {
  nameRequired: 'name required',
  nameInvalid: 'name invalid',
  nameTaken: 'name taken',
  slugInvalid: 'slug invalid',
  slugTaken: 'slug taken',
  slugReserved: 'slug reserved',
  descriptionLimit: 'description limit',
  tagInvalid: 'tag invalid',
  tagsLimit: 'tags limit',
};

describe('space form', () => {
  it('slugifies names and keeps a manual slug', () => {
    expect(slugifySpaceName('Development')).toBe('development');
    expect(slugifySpaceName('Production Web')).toBe('production-web');
    expect(nextSlugFromName('Production Web', false, '')).toBe('production-web');
    expect(nextSlugFromName('Other', true, 'custom-slug')).toBe('custom-slug');
  });

  it('rejects empty, invalid, taken, and reserved values', () => {
    expect(validateCreateSpaceForm(EMPTY_CREATE_SPACE_FORM, copy, [], []).name).toBe(
      'name required',
    );
    expect(
      validateCreateSpaceForm({ ...EMPTY_CREATE_SPACE_FORM, name: '   ' }, copy, [], []).name,
    ).toBe('name required');
    expect(
      validateCreateSpaceForm(
        { ...EMPTY_CREATE_SPACE_FORM, name: 'Dev', slug: 'dev' },
        copy,
        ['Dev'],
        [],
      ).name,
    ).toBe('name taken');
    expect(
      validateCreateSpaceForm(
        { ...EMPTY_CREATE_SPACE_FORM, name: 'Settings', slug: 'settings', slugManual: true },
        copy,
        [],
        [],
      ).slug,
    ).toBe('slug reserved');
    expect(
      validateCreateSpaceForm(
        { ...EMPTY_CREATE_SPACE_FORM, name: 'Edge', slug: 'edge--01', slugManual: true },
        copy,
        [],
        [],
      ).slug,
    ).toBe('slug invalid');
    expect(
      validateCreateSpaceForm(
        { ...EMPTY_CREATE_SPACE_FORM, name: 'Edge', slug: 'edge', slugManual: true },
        copy,
        [],
        ['edge'],
      ).slug,
    ).toBe('slug taken');
  });

  it('normalizes tags and skips duplicates', () => {
    const first = addSpaceTags([], 'Dev, testing');
    expect(first.tags).toEqual(['dev', 'testing']);
    const second = addSpaceTags(first.tags, 'dev');
    expect(second.tags).toEqual(['dev', 'testing']);
  });

  it('treats the empty default form as clean', () => {
    expect(isCreateSpaceFormDirty(EMPTY_CREATE_SPACE_FORM)).toBe(false);
    expect(isCreateSpaceFormDirty({ ...EMPTY_CREATE_SPACE_FORM, name: 'Dev' })).toBe(true);
  });
});
