import type { RosterEntry } from "../types";
import type { HistoricalTeamSeason } from "../espn";

const HITTER_WEEKLY_CV = 0.30;
const PITCHER_WEEKLY_CV = 0.45;

/**
 * Compute per-player weekly standard deviation from multi-year history.
 *
 * Two variance components:
 * 1. Weekly variance — how much a player's score fluctuates week-to-week.
 * 2. Projection uncertainty — how wrong the preseason projection might be
 *    about the player's TRUE mean. This is large early and shrinks to zero
 *    by week 12 as observed data replaces the projection.
 *
 * Without projection uncertainty, the simulation treats ESPN preseason
 * projections as near-certain, producing wildly polarized playoff odds
 * (our 9-88% range vs ESPN's own 14-64%).
 */
export function computePlayerVariance(
  entry: RosterEntry,
  totalMatchupPeriods: number,
  weeksElapsed: number = 0
): number {
  const weeklyFromInSeason = computeFromWeeklyScores(entry);
  const weeklyFromHistory = computeFromPriorYears(entry, totalMatchupPeriods);
  const weeklyDefault = computePositionalDefault(entry);

  const weeklyVariance = weeklyFromInSeason ?? weeklyFromHistory ?? weeklyDefault;

  const seasonProgress = Math.min(1, weeksElapsed / 12);
  const baseline = entry.espnProjection.perWeek;
  const projUncertainty = baseline * 0.25 * (1 - seasonProgress);

  return Math.sqrt(weeklyVariance ** 2 + projUncertainty ** 2);
}

function computeFromWeeklyScores(entry: RosterEntry): number | null {
  const scores = entry.stats.weeklyScores;
  if (scores.length < 4) return null;

  const values = scores.map((w) => w.points);
  return stdDev(values);
}

function computeFromPriorYears(
  entry: RosterEntry,
  totalMatchupPeriods: number
): number | null {
  const years = entry.priorYears.filter((y) => y.totalPoints > 0);
  if (years.length < 2) return null;

  const weeklyTotals = years.map(
    (y) => y.totalPoints / totalMatchupPeriods
  );

  const yearToYearVariance = stdDev(weeklyTotals);

  const baseProjection = entry.espnProjection.perWeek;
  if (baseProjection <= 0) return yearToYearVariance;

  const cv = entry.isPitcher ? PITCHER_WEEKLY_CV : HITTER_WEEKLY_CV;
  const withinSeasonVariance = baseProjection * cv;

  return Math.sqrt(yearToYearVariance ** 2 + withinSeasonVariance ** 2);
}

function computePositionalDefault(entry: RosterEntry): number {
  const baseline = entry.espnProjection.perWeek;
  if (baseline <= 0) return entry.isPitcher ? 8 : 5;

  const cv = entry.isPitcher ? PITCHER_WEEKLY_CV : HITTER_WEEKLY_CV;
  return Math.max(2, baseline * cv);
}

/**
 * Compute league-wide variance benchmarks from historical team scores.
 * Used to calibrate team-level variance when player data is sparse.
 */
export function computeLeagueVarianceBenchmarks(
  historicalSeasons: HistoricalTeamSeason[]
): { meanWeeklyScore: number; weeklyStdDev: number } {
  const allWeeklyScores: number[] = [];

  for (const team of historicalSeasons) {
    for (const score of team.weeklyScores.values()) {
      if (score > 0) allWeeklyScores.push(score);
    }
  }

  if (allWeeklyScores.length < 10) {
    return { meanWeeklyScore: 300, weeklyStdDev: 60 };
  }

  return {
    meanWeeklyScore: mean(allWeeklyScores),
    weeklyStdDev: stdDev(allWeeklyScores),
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}
