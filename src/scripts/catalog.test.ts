import { describe, expect, it } from 'vitest';
import {
  applyPreset,
  compareSlugsToQueryValue,
  DEFAULT_STATE,
  filterRows,
  queryToState,
  queryValueToCompareSlugs,
  sortRows,
  stateToQuery,
  type CatalogItem
} from './catalog-core';

const now = Date.parse('2026-02-22T00:00:00Z');

const rows: CatalogItem[] = [
  {
    name: 'Alpha',
    author: 'org1',
    repo: 'org1/alpha',
    slug: 'org1--alpha',
    detailsPath: '/integration/org1--alpha/',
    category: 'Energy',
    domain: 'energy',
    stars: 1200,
    featured: true,
    recommendedScore: 85,
    scoreConfidence: 82,
    url: 'https://github.com/org1/alpha',
    description: 'Energy helper',
    updatedAt: '2026-02-20T00:00:00Z',
    updatedTs: Date.parse('2026-02-20T00:00:00Z'),
    openIssues: 1,
    topics: ['energy']
  },
  {
    name: 'Beta',
    author: 'org2',
    repo: 'org2/beta',
    slug: 'org2--beta',
    detailsPath: '/integration/org2--beta/',
    category: 'Security',
    domain: 'security',
    stars: 300,
    featured: false,
    recommendedScore: 34,
    scoreConfidence: 40,
    url: 'https://github.com/org2/beta',
    description: 'Camera alerts',
    updatedAt: '2025-01-01T00:00:00Z',
    updatedTs: Date.parse('2025-01-01T00:00:00Z'),
    openIssues: 3,
    topics: ['camera']
  }
];

describe('catalog pure functions', () => {
  it('applies preset popular', () => {
    const result = applyPreset('popular');
    expect(result.stars).toBe(1000);
    expect(result.sort).toBe('stars-desc');
  });

  it('applies preset reliable', () => {
    const result = applyPreset('reliable');
    expect(result.stars).toBe(500);
    expect(result.confidence).toBe(75);
    expect(result.sort).toBe('recommended-desc');
  });

  it('filters by stars/category/featured', () => {
    const filtered = filterRows(
      rows,
      {
        ...DEFAULT_STATE,
        category: 'Energy',
        stars: 1000,
        featured: true
      },
      now
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Alpha');
  });

  it('sorts by recommended desc', () => {
    const sorted = sortRows(rows, 'recommended-desc');
    expect(sorted[0].name).toBe('Alpha');
  });

  it('filters by minimum confidence', () => {
    const filtered = filterRows(
      rows,
      {
        ...DEFAULT_STATE,
        confidence: 60
      },
      now
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Alpha');
  });

  it('serializes and restores query state', () => {
    const query = stateToQuery({
      q: 'camera',
      category: 'Security',
      stars: 500,
      updated: 30,
      confidence: 65,
      sort: 'updated-desc',
      featured: true
    });

    const restored = queryToState(query, ['Security', 'Energy']);
    expect(restored).toEqual({
      q: 'camera',
      category: 'Security',
      stars: 500,
      updated: 30,
      confidence: 65,
      sort: 'updated-desc',
      featured: true
    });
  });

  it.each([
    {
      label: 'falls back to defaults when numeric params are invalid',
      search: '?stars=abc&updated=&confidence=Infinity',
      expected: { stars: 0, updated: 0, confidence: 0 }
    },
    {
      label: 'clamps and normalizes out-of-range values',
      search: '?stars=999999&updated=9999&confidence=999',
      expected: { stars: 2500, updated: 365, confidence: 85 }
    },
    {
      label: 'normalizes non-bucket values to closest allowed values',
      search: '?stars=600&updated=40&confidence=66',
      expected: { stars: 500, updated: 30, confidence: 65 }
    },
    {
      label: 'handles negative values by clamping to zero',
      search: '?stars=-1&updated=-10&confidence=-10',
      expected: { stars: 0, updated: 0, confidence: 0 }
    },
    {
      label: 'uses lower bucket on equal distance',
      search: '?updated=60',
      expected: { updated: 30 }
    }
  ])('$label', ({ search, expected }) => {
    const restored = queryToState(search, ['Security', 'Energy']);
    expect(restored).toMatchObject({ ...DEFAULT_STATE, ...expected });
  });

  it('falls back to default sort when sort is invalid', () => {
    const restored = queryToState('?sort=invalid', ['Security', 'Energy']);
    expect(restored.sort).toBe(DEFAULT_STATE.sort);
  });

  it('serializes compare slugs into a capped, unique query value', () => {
    expect(compareSlugsToQueryValue(['alpha', 'alpha', 'beta', 'gamma', 'delta'])).toBe('alpha,beta,gamma');
  });

  it('restores compare slugs from query value', () => {
    expect(queryValueToCompareSlugs('alpha,beta,beta,gamma,delta')).toEqual(['alpha', 'beta', 'gamma']);
    expect(queryValueToCompareSlugs(null)).toEqual([]);
  });
});
