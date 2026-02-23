export type SortKey =
  | 'recommended-desc'
  | 'stars-desc'
  | 'updated-desc'
  | 'name-asc'
  | 'name-desc'
  | 'stars-asc';

export type CatalogState = {
  q: string;
  category: string;
  stars: number;
  updated: number;
  confidence: number;
  sort: SortKey;
  featured: boolean;
};

export type CatalogItem = {
  name: string;
  author: string;
  repo: string;
  slug: string;
  detailsPath: string;
  category: string;
  domain: string;
  stars: number;
  featured: boolean;
  recommendedScore: number;
  scoreConfidence?: number;
  url: string;
  description: string;
  updatedAt: string | null;
  updatedTs: number;
  openIssues: number;
  topics: string[];
};

const DAY_MS = 1000 * 60 * 60 * 24;
const MAX_COMPARE_ITEMS = 3;
const SORT_VALUES: SortKey[] = ['recommended-desc', 'stars-desc', 'updated-desc', 'name-asc', 'name-desc', 'stars-asc'];

export const DEFAULT_STATE: CatalogState = {
  q: '',
  category: 'all',
  stars: 0,
  updated: 0,
  confidence: 0,
  sort: 'recommended-desc',
  featured: false
};

export function applyPreset(preset: string, state: CatalogState = DEFAULT_STATE): CatalogState {
  const next = { ...state, ...DEFAULT_STATE };

  if (preset === 'popular') {
    return { ...next, stars: 1000, sort: 'stars-desc' };
  }

  if (preset === 'recent') {
    return { ...next, updated: 30, sort: 'updated-desc' };
  }

  if (preset === 'featured') {
    return { ...next, featured: true, sort: 'recommended-desc' };
  }

  if (preset === 'reliable') {
    return { ...next, confidence: 75, stars: 500, sort: 'recommended-desc' };
  }

  return { ...DEFAULT_STATE };
}

export function stateToQuery(state: CatalogState): string {
  const params = new URLSearchParams();

  if (state.q) params.set('q', state.q);
  if (state.category !== 'all') params.set('category', state.category);
  if (state.stars > 0) params.set('stars', String(state.stars));
  if (state.updated > 0) params.set('updated', String(state.updated));
  if (state.confidence > 0) params.set('confidence', String(state.confidence));
  if (state.sort !== DEFAULT_STATE.sort) params.set('sort', state.sort);
  if (state.featured) params.set('featured', '1');

  return params.toString();
}

export function queryToState(search: string, categories: string[]): CatalogState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  const categoryFromUrl = params.get('category') || DEFAULT_STATE.category;
  const category = categoryFromUrl === 'all' || categories.includes(categoryFromUrl) ? categoryFromUrl : 'all';

  const sortFromUrl = (params.get('sort') || DEFAULT_STATE.sort) as SortKey;
  const sort = SORT_VALUES.includes(sortFromUrl) ? sortFromUrl : DEFAULT_STATE.sort;

  const stars = Number(params.get('stars') || DEFAULT_STATE.stars);
  const updated = Number(params.get('updated') || DEFAULT_STATE.updated);
  const confidence = Number(params.get('confidence') || DEFAULT_STATE.confidence);

  return {
    q: (params.get('q') || '').trim(),
    category,
    stars: Number.isFinite(stars) && stars >= 0 ? stars : 0,
    updated: Number.isFinite(updated) && updated >= 0 ? updated : 0,
    confidence: Number.isFinite(confidence) && confidence >= 0 ? confidence : 0,
    sort,
    featured: params.get('featured') === '1'
  };
}

export function compareSlugsToQueryValue(compareSlugs: string[]): string {
  const unique = Array.from(new Set(compareSlugs.map((value) => value.trim()).filter(Boolean)));
  return unique.slice(0, MAX_COMPARE_ITEMS).join(',');
}

export function queryValueToCompareSlugs(compareValue: string | null | undefined): string[] {
  if (!compareValue) return [];
  const unique = new Set<string>();

  for (const slug of compareValue.split(',')) {
    const trimmed = slug.trim();
    if (!trimmed) continue;
    unique.add(trimmed);
    if (unique.size >= MAX_COMPARE_ITEMS) break;
  }

  return Array.from(unique);
}

export function filterRows(items: CatalogItem[], state: CatalogState, now = Date.now()): CatalogItem[] {
  const term = state.q.trim().toLowerCase();

  return items.filter((item) => {
    const searchable = `${item.name} ${item.description} ${item.author} ${item.repo} ${(item.topics || []).join(' ')}`.toLowerCase();
    const matchesTerm = searchable.includes(term);
    const matchesCategory = state.category === 'all' || item.category === state.category;
    const matchesStars = Number(item.stars) >= state.stars;
    const matchesConfidence = Number(item.scoreConfidence ?? item.recommendedScore) >= state.confidence;
    const matchesFeatured = !state.featured || item.featured;
    const matchesUpdated =
      state.updated === 0 || (item.updatedTs > 0 && now - Number(item.updatedTs) <= state.updated * DAY_MS);

    return matchesTerm && matchesCategory && matchesStars && matchesConfidence && matchesFeatured && matchesUpdated;
  });
}

export function sortRows(rows: CatalogItem[], sort: SortKey): CatalogItem[] {
  const [kind, directionRaw] = sort.split('-');
  const direction = directionRaw === 'desc' ? -1 : 1;

  return [...rows].sort((a, b) => {
    if (kind === 'recommended') return (a.recommendedScore - b.recommendedScore) * direction;
    if (kind === 'stars') return (a.stars - b.stars) * direction;
    if (kind === 'updated') return (a.updatedTs - b.updatedTs) * direction;
    return a.name.localeCompare(b.name) * direction;
  });
}
