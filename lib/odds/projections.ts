import type { RosterEntry, PlayerProjection } from "../types";

const DECAY_FACTOR = 0.85;
const MIN_STDDEV = 2.0;
const LEAGUE_AVG_PPW = 30;

/**
 * Compute player projections for all roster entries on a team.
 * Uses exponentially weighted moving average of weekly scores
 * with recency bias via the decay factor.
 */
export function projectPlayers(roster: RosterEntry[]): RosterEntry[] {
  return roster.map((entry) => ({
    ...entry,
    projection: computePlayerProjection(entry),
  }));
}

function computePlayerProjection(entry: RosterEntry): PlayerProjection {
  const weekly = entry.stats.weeklyScores;
  const sampleSize = weekly.length;

  if (sampleSize === 0) {
    return {
      projectedPointsPerWeek: estimateFallback(entry),
      stdDev: MIN_STDDEV * 3,
      recentForm: 1,
      sampleSize: 0,
      confidence: 0,
    };
  }

  const projected = exponentialWeightedAverage(
    weekly.map((w) => w.points),
    DECAY_FACTOR
  );

  const stdDev = Math.max(
    MIN_STDDEV,
    computeStdDev(weekly.map((w) => w.points))
  );

  const seasonAvg =
    weekly.reduce((s, w) => s + w.points, 0) / sampleSize;
  const recentWeeks = weekly.slice(-2);
  const recentAvg =
    recentWeeks.reduce((s, w) => s + w.points, 0) /
    recentWeeks.length;
  const recentForm = seasonAvg !== 0 ? recentAvg / seasonAvg : 1;

  const confidence = Math.min(1, Math.sqrt(sampleSize / 10));

  return {
    projectedPointsPerWeek: projected,
    stdDev,
    recentForm,
    sampleSize,
    confidence,
  };
}

/**
 * When no weekly data exists, fall back to season-level stats
 * or a conservative league-average estimate.
 */
function estimateFallback(entry: RosterEntry): number {
  if (entry.stats.pointsPerGame > 0) {
    const gamesPerWeek = entry.lineupSlot === "SP" ? 2 : 6;
    return entry.stats.pointsPerGame * gamesPerWeek;
  }
  return LEAGUE_AVG_PPW * 0.5;
}

/**
 * Exponentially weighted moving average.
 * Most recent observation gets weight 1, then decay^1, decay^2, etc.
 */
function exponentialWeightedAverage(
  values: number[],
  decay: number
): number {
  if (values.length === 0) return 0;

  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = values.length - 1; i >= 0; i--) {
    const age = values.length - 1 - i;
    const weight = Math.pow(decay, age);
    weightedSum += values[i] * weight;
    weightTotal += weight;
  }

  return weightedSum / weightTotal;
}

function computeStdDev(values: number[]): number {
  if (values.length < 2) return MIN_STDDEV;

  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);

  return Math.sqrt(variance);
}
