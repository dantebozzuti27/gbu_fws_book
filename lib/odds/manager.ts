import type { Team, ManagerProfile } from "../types";

/**
 * Compute manager activity profiles for all teams.
 *
 * Primary signal: pitcher starts per week — active managers stream
 * pitchers aggressively, cycling through the waiver wire to maximize
 * starts. This shows up as high acquisition counts for pitcher-position
 * players and more pitchers rostered overall.
 *
 * Secondary signals: total acquisitions, drops, lineup moves.
 */
export function computeManagerProfiles(
  teams: Team[],
  weeksElapsed: number
): ManagerProfile[] {
  const weeksDivisor = Math.max(1, weeksElapsed);

  const rawProfiles = teams.map((team) => {
    const tc = team.transactionCounter;

    const pitchersOnRoster = team.roster.filter((r) => r.isPitcher);
    const activePitchers = pitchersOnRoster.filter(
      (r) => r.isStarter
    );
    const recentPitcherPickups = pitchersOnRoster.filter(
      (r) => r.acquisitionType === "ADD"
    ).length;

    const pitcherStartsPerWeek =
      activePitchers.length + recentPitcherPickups / weeksDivisor;

    const uniquePitchersUsed =
      pitchersOnRoster.length + tc.acquisitions * 0.4;

    const acquisitionsPerWeek = tc.acquisitions / weeksDivisor;
    const dropsPerWeek = tc.drops / weeksDivisor;
    const totalTransactions =
      tc.acquisitions + tc.drops + tc.trades + tc.moveToActive;

    return {
      teamId: team.id,
      teamName: team.name,
      pitcherStartsPerWeek,
      uniquePitchersUsed,
      acquisitionsPerWeek,
      dropsPerWeek,
      totalTransactions,
      activityScore: 0,
      activityTier: "moderate" as const,
    };
  });

  return normalizeActivityScores(rawProfiles);
}

function normalizeActivityScores(
  profiles: ManagerProfile[]
): ManagerProfile[] {
  if (profiles.length === 0) return [];

  const rawScores = profiles.map((p) => {
    return (
      p.pitcherStartsPerWeek * 4.0 +
      p.acquisitionsPerWeek * 2.0 +
      p.dropsPerWeek * 1.5 +
      p.uniquePitchersUsed * 0.5
    );
  });

  const min = Math.min(...rawScores);
  const max = Math.max(...rawScores);
  const range = max - min || 1;

  return profiles.map((p, i) => {
    const normalized = ((rawScores[i] - min) / range) * 100;
    const score = Math.round(normalized * 10) / 10;

    let tier: ManagerProfile["activityTier"];
    if (score >= 80) tier = "elite";
    else if (score >= 60) tier = "active";
    else if (score >= 40) tier = "moderate";
    else if (score >= 20) tier = "passive";
    else tier = "inactive";

    return { ...p, activityScore: score, activityTier: tier };
  });
}

/**
 * Apply manager activity factor to team projections.
 *
 * Active managers:
 * - Reduce variance (they optimize lineups, avoid 0-point slots)
 * - Small mean boost (streaming pitchers adds expected value)
 *
 * Passive managers:
 * - Higher variance (suboptimal lineups more likely)
 * - Small mean penalty (missed streaming opportunities)
 */
export function getManagerAdjustments(profile: ManagerProfile): {
  meanMultiplier: number;
  varianceMultiplier: number;
} {
  const deviation = (profile.activityScore - 50) / 100;

  return {
    meanMultiplier: 1 + deviation * 0.05,
    varianceMultiplier: 1 - deviation * 0.15,
  };
}
