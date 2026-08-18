import { mergeTags, normalizeTag, normalizeTags, removeTags } from './tags';

describe('tag normalization', () => {
  it('lowercases and rejects empty or unsafe tags', () => {
    expect(normalizeTag('  Web ')).toBe('web');
    expect(normalizeTags(['Web', 'web', '', 'ok-1', 'BAD TAG'])).toEqual(['web', 'ok-1']);
  });

  it('merges and removes tags without duplicates', () => {
    expect(mergeTags(['web'], ['API', 'web'])).toEqual(['web', 'api']);
    expect(removeTags(['web', 'api'], ['WEB'])).toEqual(['api']);
  });
});
