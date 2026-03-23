import type { Team, TeamProjection, ManagerProfile, LineupEfficiency } from "../types";
import { getManagerAdjustments } from "./manager";

/**
 * Compute team power ratings from roster projections,
 * adjusted for manager activity and lineup efficiency.
 *
 * Inputs are all derived from real ESPN data — no synthetic values.
 */
export function computeTeamProjections(
  teams: Team[],
  managerProfiles: ManagerProfile[],
  lineupEfficiencies: LineupEfficiency[],
  teamWeeklyScores?: Map<number, Map<number, number>>
): TeamProjection[] {
  const managerMap = new Map(managerProfiles.map((m) => [m.teamId, m]));
  const lineupMap = new Map(lineupEfficiencies.map((l) => [l.teamId, l]));

  const rawProjections = teams.map((team) => {
    const starters = team.roster.filter((r) => r.isStarter);

    let rosterProjectedTotal = 0;
    let rosterVariance = 0;

    for (const p of starters) {
      const effectiveProjection =
        p.projection.projectedPointsPerWeek * p.projection.injuryMultiplier;
      rosterProjectedTotal += effectiveProjection;
      rosterVariance += p.projection.stdDev ** 2;
    }

    let rosterStdDev = Math.sqrt(rosterVariance);

    const teamScores = teamWeeklyScores?.get(team.id);
    if (teamScores && teamScores.size >= 3) {
      const scores = Array.from(teamScores.values());
      const teamHistAvg = scores.reduce((s, v) => s + v, 0) / scores.length;
      const teamHistStdDev = computeStdDev(scores);

      const avgConfidence =
        starters.length > 0
          ? starters.reduce((s, p) => s + p.projection.confidence, 0) /
            starters.length
          : 0;

      const rosterWeight = Math.max(0.4, avgConfidence);
      rosterProjectedTotal =
        rosterProjectedTotal * rosterWeight +
        teamHistAvg * (1 - rosterWeight);
      rosterStdDev =
        rosterStdDev * rosterWeight + teamHistStdDev * (1 - rosterWeight);
    }

    const manager = managerMap.get(team.id);
    const managerAdj = manager
      ? getManagerAdjustments(manager)
      : { meanMultiplier: 1, varianceMultiplier: 1 };

    rosterProjectedTotal *= managerAdj.meanMultiplier;
    rosterStdDev *= managerAdj.varianceMultiplier;

    const lineup = lineupMap.get(team.id);
    const lineupEff = lineup?.efficiency ?? 1;
    rosterProjectedTotal *= lineupEff;

    return {
      teamId: team.id,
      teamName: team.name,
      projectedWeeklyTotal: rosterProjectedTotal,
      stdDev: Math.max(5, rosterStdDev),
      powerRating: 0,
      rank: 0,
      managerScore: manager?.activityScore ?? 50,
      lineupEfficiency: lineupEff,
      strengthOfSchedule: 0,
    };
  });

  return normalizePowerRatings(rawProjections);
}

function normalizePowerRatings(projections: TeamProjection[]): TeamProjection[] {
  if (projections.length === 0) return [];

  const totals = projections.map((p) => p.projectedWeeklyTotal);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const range = max - min || 1;

  const rated = projections.map((p) => ({
    ...p,
    powerRating:
      Math.round(((p.projectedWeeklyTotal - min) / range) * 100 * 10) / 10,
  }));

  rated.sort((a, b) => b.powerRating - a.powerRating);
  return rated.map((p, i) => ({ ...p, rank: i + 1 }));
}

function computeStdDev(values: number[]): number {
  if (values.length < 2) return 10;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}
