import { describe, expect, it } from 'vitest';
import {
  freshnessSignal,
  maintenanceSignal,
  popularitySignalsFromStars,
  recommendedScoreFromSignals,
  scoreConfidenceFromSignals,
  toPercentileRanks
} from './score-model';

describe('score model', () => {
  it('computes percentile ranks and handles ties', () => {
    const ranks = toPercentileRanks([10, 10, 20]);
    expect(ranks[0]).toBe(0.25);
    expect(ranks[1]).toBe(0.25);
    expect(ranks[2]).toBe(1);
  });

  it('computes popularity signals from stars', () => {
    const signals = popularitySignalsFromStars([0, 100, 1000]);
    expect(signals[0]).toBeLessThan(signals[1]);
    expect(signals[1]).toBeLessThan(signals[2]);
  });

  it('decreases freshness as updates get older', () => {
    const now = Date.parse('2026-02-22T00:00:00Z');
    const fresh = freshnessSignal(Date.parse('2026-02-21T00:00:00Z'), now);
    const stale = freshnessSignal(Date.parse('2025-02-21T00:00:00Z'), now);
    expect(fresh).toBeGreaterThan(stale);
  });

  it('keeps very recent updates equivalent, then decays harder over weeks and months', () => {
    const now = Date.parse('2026-02-22T00:00:00Z');
    const oneDay = freshnessSignal(Date.parse('2026-02-21T00:00:00Z'), now);
    const fiveDays = freshnessSignal(Date.parse('2026-02-17T00:00:00Z'), now);
    const twoMonths = freshnessSignal(Date.parse('2025-12-22T00:00:00Z'), now);
    const oneYear = freshnessSignal(Date.parse('2025-02-22T00:00:00Z'), now);

    expect(oneDay).toBe(1);
    expect(fiveDays).toBe(1);
    expect(twoMonths).toBeLessThan(0.7);
    expect(oneYear).toBeLessThan(0.05);
  });

  it('improves maintenance signal with more stars for same issues', () => {
    const lowStars = maintenanceSignal(10, 100);
    const highStars = maintenanceSignal(10, 5000);
    expect(highStars).toBeGreaterThan(lowStars);
  });

  it('produces bounded scores', () => {
    const score = recommendedScoreFromSignals(1, 1, 1);
    const confidence = scoreConfidenceFromSignals(1, 1);
    expect(score).toBe(100);
    expect(confidence).toBe(100);
  });
});
