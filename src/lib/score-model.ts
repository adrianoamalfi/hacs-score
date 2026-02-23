const DAY_MS = 1000 * 60 * 60 * 24;

export const SCORE_WEIGHTS = {
  popularity: 0.5,
  freshness: 0.3,
  maintenance: 0.2
} as const;

export const CONFIDENCE_WEIGHTS = {
  popularity: 0.6,
  freshness: 0.4
} as const;

export const FRESHNESS_GRACE_DAYS = 14;
export const FRESHNESS_DECAY_DAYS = 90;
export const MAINTENANCE_STARS_FACTOR = 0.15;
export const MAINTENANCE_BASELINE = 15;

export const SCORE_HELP_TEXT =
  'HACS Score = 50% popularity percentile + 30% freshness decay + 20% maintenance health.';

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function toPercentileRanks(values: number[]): number[] {
  const total = values.length;
  if (total === 0) return [];
  if (total === 1) return [1];

  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value);

  const ranks = new Array<number>(total).fill(0);
  let start = 0;

  while (start < total) {
    let end = start;
    while (end + 1 < total && sorted[end + 1].value === sorted[start].value) {
      end += 1;
    }

    const percentile = ((start + end) / 2) / (total - 1);
    for (let cursor = start; cursor <= end; cursor += 1) {
      ranks[sorted[cursor].index] = percentile;
    }

    start = end + 1;
  }

  return ranks;
}

export function popularitySignalsFromStars(stars: number[]): number[] {
  const starSignals = stars.map((value) => Math.log1p(Math.max(0, value)));
  return toPercentileRanks(starSignals);
}

export function freshnessSignal(updatedTs: number, nowTs: number): number {
  if (updatedTs <= 0) return 0;
  const ageDays = Math.max(0, (nowTs - updatedTs) / DAY_MS);
  if (ageDays <= FRESHNESS_GRACE_DAYS) return 1;
  return Math.exp(-(ageDays - FRESHNESS_GRACE_DAYS) / FRESHNESS_DECAY_DAYS);
}

export function maintenanceSignal(openIssues: number, stars: number): number {
  const issues = Math.max(0, openIssues);
  const starsSafe = Math.max(0, stars);
  return clamp01(1 - issues / (issues + starsSafe * MAINTENANCE_STARS_FACTOR + MAINTENANCE_BASELINE));
}

export function recommendedScoreFromSignals(popularity: number, freshness: number, maintenance: number): number {
  return round1((SCORE_WEIGHTS.popularity * popularity + SCORE_WEIGHTS.freshness * freshness + SCORE_WEIGHTS.maintenance * maintenance) * 100);
}

export function scoreConfidenceFromSignals(popularity: number, freshness: number): number {
  return round1((CONFIDENCE_WEIGHTS.popularity * popularity + CONFIDENCE_WEIGHTS.freshness * freshness) * 100);
}
