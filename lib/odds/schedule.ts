import type { TeamProjection } from "../types";
import type { RawMatchup } from "../espn";

/**
 * Compute strength of remaining schedule for each team.
 *
 * For each team, look at their future opponents' power ratings.
 * A team with mostly weak remaining opponents has a favorable schedule
 * (higher SoS score = easier). This feeds into playoff odds.
 */
export function computeStrengthOfSchedule(
  teamProjections: TeamProjection[],
  schedule: RawMatchup[],
  currentWeek: number,
  regularSeasonEnd: number
): Map<number, number> {
  const projMap = new Map(teamProjections.map((p) => [p.teamId, p]));
  const teamSoS = new Map<number, number>();

  const avgPower =
    teamProjections.reduce((s, p) => s + p.powerRating, 0) /
    (teamProjections.length || 1);

  const remainingMatchups = schedule.filter(
    (m) =>
      m.matchupPeriodId > currentWeek &&
      m.matchupPeriodId <= regularSeasonEnd
  );

  const opponentRatings = new Map<number, number[]>();
  for (const m of remainingMatchups) {
    const homeOpp = projMap.get(m.awayTeamId);
    const awayOpp = projMap.get(m.homeTeamId);

    if (homeOpp) {
      const existing = opponentRatings.get(m.homeTeamId) ?? [];
      existing.push(homeOpp.powerRating);
      opponentRatings.set(m.homeTeamId, existing);
    }
    if (awayOpp) {
      const existing = opponentRatings.get(m.awayTeamId) ?? [];
      existing.push(awayOpp.powerRating);
      opponentRatings.set(m.awayTeamId, existing);
    }
  }

  for (const proj of teamProjections) {
    const oppRatings = opponentRatings.get(proj.teamId);
    if (!oppRatings || oppRatings.length === 0) {
      teamSoS.set(proj.teamId, 50);
      continue;
    }

    const avgOppRating =
      oppRatings.reduce((s, r) => s + r, 0) / oppRatings.length;

    const sos = Math.max(
      0,
      Math.min(100, 50 + (avgPower - avgOppRating) * 0.5)
    );
    teamSoS.set(proj.teamId, Math.round(sos * 10) / 10);
  }

  return teamSoS;
}
