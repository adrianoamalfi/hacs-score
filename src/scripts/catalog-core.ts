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

export type FilterChipKey = 'q' | 'category' | 'stars' | 'updated' | 'confidence' | 'sort' | 'featured';

export type ActiveFilterChip = {
  key: FilterChipKey;
  label: string;
};

export type EmptyStateAction = 'clear-updated' | 'lower-confidence' | 'disable-featured' | 'reset-all';

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
const ALLOWED_STARS = [0, 100, 500, 1000, 2500];
const ALLOWED_UPDATED = [0, 30, 90, 365];
const ALLOWED_CONFIDENCE = [0, 50, 65, 75, 85];
const SORT_LABELS: Record<SortKey, string> = {
  'recommended-desc': 'HACS Score',
  'stars-desc': 'Most stars',
  'updated-desc': 'Recently updated',
  'name-asc': 'Name A-Z',
  'name-desc': 'Name Z-A',
  'stars-asc': 'Fewest stars'
};
const UPDATED_LABELS: Record<number, string> = {
  30: 'last 30 days',
  90: 'last 90 days',
  365: 'last year'
};

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

function toStarsLabel(stars: number): string {
  return `${stars.toLocaleString('en-US')}+`;
}

function toUpdatedLabel(days: number): string {
  return UPDATED_LABELS[days] || `last ${days} days`;
}

function getPreviousConfidenceStep(confidence: number): number {
  for (let idx = ALLOWED_CONFIDENCE.length - 1; idx >= 0; idx -= 1) {
    const candidate = ALLOWED_CONFIDENCE[idx];
    if (candidate < confidence) return candidate;
  }
  return 0;
}

export function buildActiveFilterChips(state: CatalogState): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (state.q) chips.push({ key: 'q', label: `Search: ${state.q}` });
  if (state.category !== 'all') chips.push({ key: 'category', label: `Category: ${state.category}` });
  if (state.stars > 0) chips.push({ key: 'stars', label: `Min stars: ${toStarsLabel(state.stars)}` });
  if (state.updated > 0) chips.push({ key: 'updated', label: `Updated: ${toUpdatedLabel(state.updated)}` });
  if (state.confidence > 0) chips.push({ key: 'confidence', label: `Min confidence: ${state.confidence}+` });
  if (state.sort !== DEFAULT_STATE.sort) chips.push({ key: 'sort', label: `Sort: ${SORT_LABELS[state.sort]}` });
  if (state.featured) chips.push({ key: 'featured', label: 'Featured only' });

  return chips;
}

export function clearFilter(state: CatalogState, key: FilterChipKey): CatalogState {
  if (key === 'q') return { ...state, q: DEFAULT_STATE.q };
  if (key === 'category') return { ...state, category: DEFAULT_STATE.category };
  if (key === 'stars') return { ...state, stars: DEFAULT_STATE.stars };
  if (key === 'updated') return { ...state, updated: DEFAULT_STATE.updated };
  if (key === 'confidence') return { ...state, confidence: DEFAULT_STATE.confidence };
  if (key === 'sort') return { ...state, sort: DEFAULT_STATE.sort };
  return { ...state, featured: DEFAULT_STATE.featured };
}

export function getEmptyStateActions(state: CatalogState): EmptyStateAction[] {
  const actions: EmptyStateAction[] = [];

  if (state.updated > 0) actions.push('clear-updated');
  if (state.confidence > 0) actions.push('lower-confidence');
  if (state.featured) actions.push('disable-featured');

  return actions.length > 0 ? actions : ['reset-all'];
}

export function applyEmptyStateAction(state: CatalogState, action: EmptyStateAction): CatalogState {
  if (action === 'clear-updated') return { ...state, updated: 0 };
  if (action === 'lower-confidence') return { ...state, confidence: getPreviousConfidenceStep(state.confidence) };
  if (action === 'disable-featured') return { ...state, featured: false };
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

function parseQueryNumber(value: string | null, fallback: number): number {
  if (value === null || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function closestAllowedValue(value: number, allowedValues: number[]): number {
  let closest = allowedValues[0];
  let smallestDistance = Math.abs(value - closest);

  for (let idx = 1; idx < allowedValues.length; idx += 1) {
    const candidate = allowedValues[idx];
    const distance = Math.abs(value - candidate);
    if (distance < smallestDistance || (distance === smallestDistance && candidate < closest)) {
      closest = candidate;
      smallestDistance = distance;
    }
  }

  return closest;
}

export function queryToState(search: string, categories: string[]): CatalogState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  const categoryFromUrl = params.get('category') || DEFAULT_STATE.category;
  const category = categoryFromUrl === 'all' || categories.includes(categoryFromUrl) ? categoryFromUrl : 'all';

  const sortFromUrl = (params.get('sort') || DEFAULT_STATE.sort) as SortKey;
  const sort = SORT_VALUES.includes(sortFromUrl) ? sortFromUrl : DEFAULT_STATE.sort;

  const starsRaw = parseQueryNumber(params.get('stars'), DEFAULT_STATE.stars);
  const updatedRaw = parseQueryNumber(params.get('updated'), DEFAULT_STATE.updated);
  const confidenceRaw = parseQueryNumber(params.get('confidence'), DEFAULT_STATE.confidence);

  const stars = closestAllowedValue(clamp(starsRaw, 0, 2500), ALLOWED_STARS);
  const updated = closestAllowedValue(clamp(updatedRaw, 0, 365), ALLOWED_UPDATED);
  const confidence = closestAllowedValue(clamp(confidenceRaw, 0, 100), ALLOWED_CONFIDENCE);

  return {
    q: (params.get('q') || '').trim(),
    category,
    stars,
    updated,
    confidence,
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
