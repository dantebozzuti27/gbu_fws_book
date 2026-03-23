import type { Team, ManagerProfile } from "../types";
import type { HistoricalManagerData } from "../espn";

const SEASON_WEIGHTS: Record<number, number> = {
  2025: 1.0,
  2024: 0.7,
  2023: 0.4,
  2022: 0.2,
};

/**
 * Compute manager activity profiles for all teams.
 *
 * Primary signal: pitcher starts per week — active managers stream
 * pitchers aggressively, cycling through the waiver wire to maximize
 * starts.
 *
 * Preseason (< week 4): uses historical transaction data from 2022-2025
 * as the baseline. Recency-weighted so 2025 counts ~5x more than 2022.
 *
 * In-season (>= week 4): blends current-year activity with historical
 * baseline to avoid overreacting to small sample sizes early on.
 */
export function computeManagerProfiles(
  teams: Team[],
  weeksElapsed: number,
  historicalData: HistoricalManagerData[] = []
): ManagerProfile[] {
  const historicalProfiles = computeHistoricalBaseline(teams, historicalData);

  if (weeksElapsed < 4) {
    if (historicalProfiles.length > 0) {
      return historicalProfiles;
    }
    return teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      pitcherStartsPerWeek: 0,
      uniquePitchersUsed: 0,
      acquisitionsPerWeek: 0,
      dropsPerWeek: 0,
      totalTransactions: 0,
      activityScore: 50,
      activityTier: "moderate" as const,
    }));
  }

  const weeksDivisor = Math.max(1, weeksElapsed);
  const histMap = new Map(historicalProfiles.map((p) => [p.teamId, p]));

  const rawProfiles = teams.map((team) => {
    const tc = team.transactionCounter;

    const pitchersOnRoster = team.roster.filter((r) => r.isPitcher);
    const activePitchers = pitchersOnRoster.filter((r) => r.isStarter);
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

    const histProfile = histMap.get(team.id);
    const histWeight = Math.max(0, 0.5 - weeksElapsed * 0.03);
    const currentWeight = 1 - histWeight;

    const blendedAcqPerWeek = histProfile
      ? acquisitionsPerWeek * currentWeight +
        histProfile.acquisitionsPerWeek * histWeight
      : acquisitionsPerWeek;

    const blendedDropsPerWeek = histProfile
      ? dropsPerWeek * currentWeight +
        histProfile.dropsPerWeek * histWeight
      : dropsPerWeek;

    return {
      teamId: team.id,
      teamName: team.name,
      pitcherStartsPerWeek,
      uniquePitchersUsed,
      acquisitionsPerWeek: blendedAcqPerWeek,
      dropsPerWeek: blendedDropsPerWeek,
      totalTransactions,
      activityScore: 0,
      activityTier: "moderate" as const,
    };
  });

  return normalizeActivityScores(rawProfiles);
}

function computeHistoricalBaseline(
  teams: Team[],
  historicalData: HistoricalManagerData[]
): ManagerProfile[] {
  if (historicalData.length === 0) return [];

  const teamHistMap = new Map<
    number,
    { weightedAcq: number; weightedDrops: number; totalWeight: number }
  >();

  for (const hd of historicalData) {
    const weight = SEASON_WEIGHTS[hd.season] ?? 0.2;
    const existing = teamHistMap.get(hd.teamId) ?? {
      weightedAcq: 0,
      weightedDrops: 0,
      totalWeight: 0,
    };

    const seasonWeeks = 22;
    existing.weightedAcq += (hd.acquisitions / seasonWeeks) * weight;
    existing.weightedDrops += (hd.drops / seasonWeeks) * weight;
    existing.totalWeight += weight;

    teamHistMap.set(hd.teamId, existing);
  }

  const profiles: ManagerProfile[] = teams.map((team) => {
    const hist = teamHistMap.get(team.id);
    if (!hist || hist.totalWeight === 0) {
      return {
        teamId: team.id,
        teamName: team.name,
        pitcherStartsPerWeek: 0,
        uniquePitchersUsed: 0,
        acquisitionsPerWeek: 0,
        dropsPerWeek: 0,
        totalTransactions: 0,
        activityScore: 50,
        activityTier: "moderate" as const,
      };
    }

    const acqPerWeek = hist.weightedAcq / hist.totalWeight;
    const dropsPerWeek = hist.weightedDrops / hist.totalWeight;

    return {
      teamId: team.id,
      teamName: team.name,
      pitcherStartsPerWeek: 0,
      uniquePitchersUsed: 0,
      acquisitionsPerWeek: acqPerWeek,
      dropsPerWeek: dropsPerWeek,
      totalTransactions: 0,
      activityScore: 0,
      activityTier: "moderate" as const,
    };
  });

  return normalizeActivityScores(profiles);
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
 * Active managers get a small mean boost and reduced variance.
 * Passive managers get a small penalty and increased variance.
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
