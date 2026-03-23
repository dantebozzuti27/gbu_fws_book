import type { Team, TeamProjection } from "../types";

/**
 * Compute team power ratings from roster projections.
 *
 * For each team:
 * 1. Sum projected points of all starters (exclude bench + IL)
 * 2. Combine player variances assuming independence: σ_team = √(Σ σ_i²)
 * 3. Normalize to a 0-100 power rating scale across the league
 *
 * Also accepts historical team-level weekly scores as a fallback/blend
 * for early-season when player-level data is sparse.
 */
export function computeTeamProjections(
  teams: Team[],
  teamWeeklyScores?: Map<number, Map<number, number>>
): TeamProjection[] {
  const rawProjections = teams.map((team) => {
    const starters = team.roster.filter((r) => r.isStarter);

    const rosterProjectedTotal = starters.reduce(
      (sum, p) => sum + p.projection.projectedPointsPerWeek,
      0
    );

    const rosterVariance = starters.reduce(
      (sum, p) => sum + p.projection.stdDev ** 2,
      0
    );
    const rosterStdDev = Math.sqrt(rosterVariance);

    const teamScores = teamWeeklyScores?.get(team.id);
    let finalProjected = rosterProjectedTotal;
    let finalStdDev = rosterStdDev;

    if (teamScores && teamScores.size >= 3) {
      const scores = Array.from(teamScores.values());
      const teamHistAvg =
        scores.reduce((s, v) => s + v, 0) / scores.length;
      const teamHistStdDev = computeStdDev(scores);

      const avgConfidence =
        starters.length > 0
          ? starters.reduce((s, p) => s + p.projection.confidence, 0) /
            starters.length
          : 0;

      const rosterWeight = Math.max(0.3, avgConfidence);
      finalProjected =
        rosterProjectedTotal * rosterWeight +
        teamHistAvg * (1 - rosterWeight);
      finalStdDev =
        rosterStdDev * rosterWeight +
        teamHistStdDev * (1 - rosterWeight);
    }

    return {
      teamId: team.id,
      teamName: team.name,
      projectedWeeklyTotal: finalProjected,
      stdDev: Math.max(5, finalStdDev),
      powerRating: 0,
      rank: 0,
    };
  });

  return normalizePowerRatings(rawProjections);
}

function normalizePowerRatings(
  projections: TeamProjection[]
): TeamProjection[] {
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
