import type {
  TeamProjection,
  PlayoffOdds,
  ChampionshipOdds,
  LeagueSettings,
  Team,
  ESPNSimulationResult,
} from "../types";
import type { RawMatchup } from "../espn";
import { sampleNormal, probabilityToAmericanOdds } from "./utils";

const SIMULATION_RUNS = 25_000;
const ESPN_BLEND_WEIGHT = 0.3;
const DIVERGENCE_THRESHOLD = 0.20;

interface SimulationResults {
  playoffOdds: PlayoffOdds[];
  championshipOdds: ChampionshipOdds[];
  simulationRuns: number;
}

interface StandingsEntry {
  teamId: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
}

/**
 * Schedule-aware Monte Carlo simulation with ESPN calibration.
 *
 * Improvements over V1:
 * - Uses actual future schedule (not random pairings)
 * - Applies manager-adjusted projections with correct variance
 * - Cross-checks against ESPN's own simulation for calibration
 * - 25,000 iterations for tighter confidence intervals
 */
export function runSeasonSimulation(
  teams: Team[],
  teamProjections: TeamProjection[],
  settings: LeagueSettings,
  schedule: RawMatchup[]
): SimulationResults {
  const projMap = new Map(teamProjections.map((p) => [p.teamId, p]));
  const currentWeek = settings.currentMatchupPeriod;
  const regularSeasonEnd = settings.playoffStartPeriod - 1;
  const playoffTeamCount = settings.playoffTeamCount;

  const futureMatchups = schedule.filter(
    (m) =>
      m.matchupPeriodId >= currentWeek &&
      m.matchupPeriodId <= regularSeasonEnd &&
      (m.winner === "UNDECIDED" || (m.homeScore === 0 && m.awayScore === 0))
  );

  const teamIds = teams.map((t) => t.id);
  const counters = initCounters(teamIds);

  for (let sim = 0; sim < SIMULATION_RUNS; sim++) {
    const standings = initStandings(teams);

    for (const matchup of futureMatchups) {
      const homeProj = projMap.get(matchup.homeTeamId);
      const awayProj = projMap.get(matchup.awayTeamId);
      if (!homeProj || !awayProj) continue;

      const homeScore = sampleNormal(
        homeProj.projectedWeeklyTotal,
        homeProj.stdDev
      );
      const awayScore = sampleNormal(
        awayProj.projectedWeeklyTotal,
        awayProj.stdDev
      );

      const home = standings.get(matchup.homeTeamId)!;
      const away = standings.get(matchup.awayTeamId)!;

      if (homeScore > awayScore) {
        home.wins++;
        away.losses++;
      } else if (awayScore > homeScore) {
        away.wins++;
        home.losses++;
      } else {
        home.ties++;
        away.ties++;
      }
      home.pointsFor += homeScore;
      away.pointsFor += awayScore;
    }

    const sorted = rankStandings(standings);
    const playoffTeams = sorted.slice(0, playoffTeamCount);

    for (const entry of playoffTeams) {
      counters.madePlayoffs.set(
        entry.teamId,
        (counters.madePlayoffs.get(entry.teamId) ?? 0) + 1
      );
    }
    if (playoffTeams.length > 0) {
      counters.topSeed.set(
        playoffTeams[0].teamId,
        (counters.topSeed.get(playoffTeams[0].teamId) ?? 0) + 1
      );
    }

    const champion = simulatePlayoffBracket(playoffTeams, projMap);
    if (champion) {
      counters.wonChampionship.set(
        champion.champId,
        (counters.wonChampionship.get(champion.champId) ?? 0) + 1
      );
      for (const fId of champion.finalistIds) {
        counters.madeFinals.set(
          fId,
          (counters.madeFinals.get(fId) ?? 0) + 1
        );
      }
      for (const sId of champion.semisIds) {
        counters.madeSemis.set(
          sId,
          (counters.madeSemis.get(sId) ?? 0) + 1
        );
      }
    }
  }

  const espnSimMap = new Map<number, ESPNSimulationResult>(
    teams.map((t) => [t.id, t.espnSimulation])
  );

  const leader = teams.reduce(
    (best, t) => (t.record.wins > best.wins ? { id: t.id, wins: t.record.wins } : best),
    { id: 0, wins: -1 }
  );
  const leaderTeam = teams.find((t) => t.id === leader.id);

  const playoffOdds: PlayoffOdds[] = teams.map((t) => {
    let prob = (counters.madePlayoffs.get(t.id) ?? 0) / SIMULATION_RUNS;
    const topProb = (counters.topSeed.get(t.id) ?? 0) / SIMULATION_RUNS;

    const espnSim = espnSimMap.get(t.id);
    if (espnSim && Math.abs(prob - espnSim.playoffPct) > DIVERGENCE_THRESHOLD) {
      prob = prob * (1 - ESPN_BLEND_WEIGHT) + espnSim.playoffPct * ESPN_BLEND_WEIGHT;
    }

    const leaderLosses = leaderTeam?.record.losses ?? 0;
    const gamesBack = Math.max(
      0,
      (leader.wins - t.record.wins + (t.record.losses - leaderLosses)) / 2
    );

    return {
      teamId: t.id,
      teamName: t.name,
      currentRecord: `${t.record.wins}-${t.record.losses}${t.record.ties > 0 ? `-${t.record.ties}` : ""}`,
      gamesBack,
      makePlayoffProb: Math.round(prob * 1000) / 1000,
      topSeedProb: Math.round(topProb * 1000) / 1000,
      americanOdds: probabilityToAmericanOdds(prob),
    };
  });

  playoffOdds.sort((a, b) => b.makePlayoffProb - a.makePlayoffProb);

  const championshipOdds: ChampionshipOdds[] = teams.map((t) => {
    const champProb = (counters.wonChampionship.get(t.id) ?? 0) / SIMULATION_RUNS;
    const finalsProb = (counters.madeFinals.get(t.id) ?? 0) / SIMULATION_RUNS;
    const semisProb = (counters.madeSemis.get(t.id) ?? 0) / SIMULATION_RUNS;

    return {
      teamId: t.id,
      teamName: t.name,
      winChampionshipProb: Math.round(champProb * 1000) / 1000,
      makeFinalsProb: Math.round(finalsProb * 1000) / 1000,
      makeSemisProb: Math.round(semisProb * 1000) / 1000,
      americanOdds: probabilityToAmericanOdds(champProb),
    };
  });

  championshipOdds.sort((a, b) => b.winChampionshipProb - a.winChampionshipProb);

  return { playoffOdds, championshipOdds, simulationRuns: SIMULATION_RUNS };
}

function initStandings(teams: Team[]): Map<number, StandingsEntry> {
  const map = new Map<number, StandingsEntry>();
  for (const t of teams) {
    map.set(t.id, {
      teamId: t.id,
      wins: t.record.wins,
      losses: t.record.losses,
      ties: t.record.ties,
      pointsFor: t.pointsFor,
    });
  }
  return map;
}

function rankStandings(standings: Map<number, StandingsEntry>): StandingsEntry[] {
  const entries = Array.from(standings.values());
  entries.sort((a, b) => {
    const aWinPct = (a.wins + a.ties * 0.5) / Math.max(1, a.wins + a.losses + a.ties);
    const bWinPct = (b.wins + b.ties * 0.5) / Math.max(1, b.wins + b.losses + b.ties);
    if (bWinPct !== aWinPct) return bWinPct - aWinPct;
    return b.pointsFor - a.pointsFor;
  });
  return entries;
}

interface PlayoffResult {
  champId: number;
  finalistIds: number[];
  semisIds: number[];
}

function simulatePlayoffBracket(
  seeds: StandingsEntry[],
  projMap: Map<number, TeamProjection>
): PlayoffResult | null {
  if (seeds.length < 2) return null;

  const seedIds = seeds.map((s) => s.teamId);
  const semisIds = [...seedIds];

  let bracket = [...seedIds];
  if (bracket.length >= 4) {
    const round1: number[] = [];
    const mid = bracket.length / 2;
    for (let i = 0; i < mid; i++) {
      const higher = bracket[i];
      const lower = bracket[bracket.length - 1 - i];
      round1.push(simulateMatchup(higher, lower, projMap));
    }
    bracket = round1;
  }

  const finalistIds = [...bracket];
  while (bracket.length > 1) {
    const nextRound: number[] = [];
    for (let i = 0; i < bracket.length; i += 2) {
      if (i + 1 < bracket.length) {
        nextRound.push(simulateMatchup(bracket[i], bracket[i + 1], projMap));
      } else {
        nextRound.push(bracket[i]);
      }
    }
    bracket = nextRound;
  }

  return { champId: bracket[0], finalistIds, semisIds };
}

function simulateMatchup(
  teamAId: number,
  teamBId: number,
  projMap: Map<number, TeamProjection>
): number {
  const projA = projMap.get(teamAId);
  const projB = projMap.get(teamBId);
  if (!projA || !projB) return teamAId;

  const scoreA = sampleNormal(projA.projectedWeeklyTotal, projA.stdDev);
  const scoreB = sampleNormal(projB.projectedWeeklyTotal, projB.stdDev);
  return scoreA >= scoreB ? teamAId : teamBId;
}

interface SimCounters {
  madePlayoffs: Map<number, number>;
  topSeed: Map<number, number>;
  wonChampionship: Map<number, number>;
  madeFinals: Map<number, number>;
  madeSemis: Map<number, number>;
}

function initCounters(teamIds: number[]): SimCounters {
  const counters: SimCounters = {
    madePlayoffs: new Map(),
    topSeed: new Map(),
    wonChampionship: new Map(),
    madeFinals: new Map(),
    madeSemis: new Map(),
  };
  for (const id of teamIds) {
    counters.madePlayoffs.set(id, 0);
    counters.topSeed.set(id, 0);
    counters.wonChampionship.set(id, 0);
    counters.madeFinals.set(id, 0);
    counters.madeSemis.set(id, 0);
  }
  return counters;
}
