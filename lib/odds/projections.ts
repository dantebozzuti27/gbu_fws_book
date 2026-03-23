import type { RosterEntry, PlayerProjection } from "../types";
import { computePlayerVariance } from "./variance";
import { getInjuryMultiplier } from "./injuries";

const ESPN_PRIOR_WEIGHT = 10;
const EWMA_DECAY = 0.85;

/**
 * Three-phase player projection engine.
 *
 * Phase 1 — Preseason (weeks 1-2): ESPN projection is the baseline.
 * Phase 2 — Early season (weeks 3-8): Bayesian blend of ESPN prior + observed data.
 * Phase 3 — Mid/late season (weeks 9+): In-season data dominates, ESPN regresses.
 *
 * All projections use real ESPN data. No synthetic/fake values.
 */
export function projectPlayers(
  roster: RosterEntry[],
  currentWeek: number,
  totalMatchupPeriods: number
): RosterEntry[] {
  return roster.map((entry) => ({
    ...entry,
    projection: computeProjection(entry, currentWeek, totalMatchupPeriods),
  }));
}

function computeProjection(
  entry: RosterEntry,
  currentWeek: number,
  totalMatchupPeriods: number
): PlayerProjection {
  const espnBaseline = entry.espnProjection.perWeek;
  const weeklyScores = entry.stats.weeklyScores;
  const sampleSize = weeklyScores.length;
  const injuryMult = getInjuryMultiplier(entry);

  const stdDev = computePlayerVariance(entry, totalMatchupPeriods);

  if (sampleSize === 0 || currentWeek <= 2) {
    return preseasonProjection(entry, espnBaseline, stdDev, injuryMult);
  }

  if (currentWeek <= 8) {
    return earlySeasonProjection(
      entry,
      espnBaseline,
      weeklyScores,
      sampleSize,
      stdDev,
      injuryMult
    );
  }

  return lateSeasonProjection(
    entry,
    espnBaseline,
    weeklyScores,
    sampleSize,
    stdDev,
    injuryMult
  );
}

function preseasonProjection(
  entry: RosterEntry,
  espnBaseline: number,
  stdDev: number,
  injuryMult: number
): PlayerProjection {
  let projected = espnBaseline;

  if (projected <= 0 && entry.priorYears.length > 0) {
    const recentYear = entry.priorYears[0];
    projected = recentYear.totalPoints / 25;
  }

  return {
    projectedPointsPerWeek: projected * injuryMult,
    stdDev,
    recentForm: 1.0,
    sampleSize: 0,
    confidence: projected > 0 ? 0.7 : 0.1,
    source: "espn_projection",
    espnBaseline,
    injuryMultiplier: injuryMult,
  };
}

function earlySeasonProjection(
  entry: RosterEntry,
  espnBaseline: number,
  weeklyScores: { points: number }[],
  sampleSize: number,
  stdDev: number,
  injuryMult: number
): PlayerProjection {
  const observedMean =
    weeklyScores.reduce((s, w) => s + w.points, 0) / sampleSize;

  const posteriorMean =
    (ESPN_PRIOR_WEIGHT * espnBaseline + sampleSize * observedMean) /
    (ESPN_PRIOR_WEIGHT + sampleSize);

  const recentForm = computeRecentForm(weeklyScores, observedMean);
  const confidence = Math.min(0.95, 0.7 + sampleSize * 0.03);

  return {
    projectedPointsPerWeek: posteriorMean * injuryMult,
    stdDev,
    recentForm,
    sampleSize,
    confidence,
    source: "bayesian_blend",
    espnBaseline,
    injuryMultiplier: injuryMult,
  };
}

function lateSeasonProjection(
  entry: RosterEntry,
  espnBaseline: number,
  weeklyScores: { points: number }[],
  sampleSize: number,
  stdDev: number,
  injuryMult: number
): PlayerProjection {
  const ewma = exponentialWeightedAverage(
    weeklyScores.map((w) => w.points),
    EWMA_DECAY
  );

  const espnWeight = Math.max(0.15, 0.3 - sampleSize * 0.01);
  const projected = ewma * (1 - espnWeight) + espnBaseline * espnWeight;

  const observedMean =
    weeklyScores.reduce((s, w) => s + w.points, 0) / sampleSize;
  const recentForm = computeRecentForm(weeklyScores, observedMean);
  const confidence = Math.min(0.99, 0.8 + sampleSize * 0.01);

  return {
    projectedPointsPerWeek: projected * injuryMult,
    stdDev,
    recentForm,
    sampleSize,
    confidence,
    source: "in_season",
    espnBaseline,
    injuryMultiplier: injuryMult,
  };
}

function computeRecentForm(
  weeklyScores: { points: number }[],
  seasonMean: number
): number {
  if (weeklyScores.length < 2 || seasonMean === 0) return 1.0;
  const recent = weeklyScores.slice(-2);
  const recentAvg = recent.reduce((s, w) => s + w.points, 0) / recent.length;
  return recentAvg / seasonMean;
}

function exponentialWeightedAverage(values: number[], decay: number): number {
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
