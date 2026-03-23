import {
  type Team,
  type RosterEntry,
  type PlayerSeasonStats,
  type WeeklyScore,
  type LeagueSettings,
  type ScoringRule,
  type ESPNPlayerProjection,
  type PriorYearStats,
  type TransactionCounter,
  type ESPNSimulationResult,
  ESPN_LINEUP_SLOT_MAP,
  ESPN_POSITION_MAP,
  PITCHER_POSITION_IDS,
} from "./types";

const ESPN_API_BASE =
  "https://lm-api-reads.fantasy.espn.com/apis/v3/games/flb/seasons";

interface ESPNFetchOptions {
  leagueId: number;
  seasonId: number;
  espnS2: string;
  swid: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function fetchRawLeagueData(opts: ESPNFetchOptions): Promise<any> {
  const url = new URL(
    `${ESPN_API_BASE}/${opts.seasonId}/segments/0/leagues/${opts.leagueId}`
  );
  const views = ["mTeam", "mRoster", "mSettings", "mMatchup", "mMatchupScore", "mStandings"];
  views.forEach((v) => url.searchParams.append("view", v));

  const res = await fetch(url.toString(), {
    headers: {
      Cookie: `espn_s2=${opts.espnS2}; SWID=${opts.swid}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`ESPN API returned ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function fetchHistoricalSeason(
  opts: ESPNFetchOptions,
  year: number
): Promise<any> {
  const url = new URL(
    `${ESPN_API_BASE}/${year}/segments/0/leagues/${opts.leagueId}`
  );
  const views = ["mTeam", "mMatchup", "mStandings", "mRoster"];
  views.forEach((v) => url.searchParams.append("view", v));

  const res = await fetch(url.toString(), {
    headers: {
      Cookie: `espn_s2=${opts.espnS2}; SWID=${opts.swid}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

export function parseLeagueSettings(raw: any): LeagueSettings {
  const s = raw.settings;
  const schedule = s.scheduleSettings;
  const scoring = s.scoringSettings;

  const scoringItems: ScoringRule[] = (scoring?.scoringItems ?? []).map(
    (item: any) => ({
      statId: item.statId,
      pointsOverride: item.pointsOverride ?? item.points ?? 0,
    })
  );

  const totalMatchupPeriods =
    schedule?.matchupPeriodCount ?? schedule?.numberOfMatchupPeriods ?? 22;

  const playoffTeamCount =
    schedule?.playoffTeamCount ?? s.playoffSettings?.playoffTeamCount ?? 4;

  const playoffMatchupPeriods = schedule?.playoffMatchupPeriodLength ?? 1;
  const playoffRounds = Math.ceil(Math.log2(playoffTeamCount));
  const playoffStartPeriod =
    totalMatchupPeriods - playoffRounds * playoffMatchupPeriods + 1;

  return {
    leagueId: raw.id,
    seasonId: raw.seasonId,
    name: s.name,
    scoringType: "H2H_POINTS",
    scoringItems,
    totalMatchupPeriods,
    currentMatchupPeriod:
      raw.scoringPeriodId ?? raw.status?.currentMatchupPeriod ?? 1,
    playoffTeamCount,
    playoffStartPeriod,
    teamCount: raw.teams?.length ?? s.size ?? 10,
  };
}

export function parseTeams(
  raw: any,
  totalMatchupPeriods: number
): Team[] {
  const teams: any[] = raw.teams ?? [];

  return teams.map((t: any) => {
    const record = t.record?.overall ?? {};
    const totalWins = record.wins ?? 0;
    const totalLosses = record.losses ?? 0;
    const totalTies = record.ties ?? 0;
    const totalGames = totalWins + totalLosses + totalTies;

    const roster = parseRoster(t.roster?.entries ?? [], totalMatchupPeriods);

    const tc = t.transactionCounter ?? {};
    const transactionCounter: TransactionCounter = {
      acquisitions: tc.acquisitions ?? 0,
      drops: tc.drops ?? 0,
      trades: tc.trades ?? 0,
      moveToActive: tc.moveToActive ?? 0,
      moveToIR: tc.moveToIR ?? 0,
    };

    const sim = t.currentSimulationResults ?? {};
    const modeRec = sim.modeRecord ?? {};
    const espnSimulation: ESPNSimulationResult = {
      playoffPct: sim.playoffPct ?? 0,
      divisionWinPct: sim.divisionWinPct ?? 0,
      rank: sim.rank ?? 99,
      projectedWins: modeRec.wins ?? 0,
      projectedLosses: modeRec.losses ?? 0,
    };

    return {
      id: t.id,
      name: t.name ?? `${t.location ?? ""} ${t.nickname ?? ""}`.trim(),
      abbreviation: t.abbrev ?? "???",
      owners:
        t.owners?.map((o: any) =>
          typeof o === "string" ? o : o.id ?? o.displayName ?? "Unknown"
        ) ?? [],
      record: {
        wins: totalWins,
        losses: totalLosses,
        ties: totalTies,
        pct: totalGames > 0 ? totalWins / totalGames : 0,
      },
      pointsFor: record.pointsFor ?? t.points ?? 0,
      pointsAgainst: record.pointsAgainst ?? 0,
      streakType:
        record.streakType === 2 ? "L" : record.streakType === 3 ? "T" : "W",
      streakLength: record.streakLength ?? 0,
      roster,
      transactionCounter,
      espnSimulation,
    };
  });
}

function parseRoster(
  entries: any[],
  totalMatchupPeriods: number
): RosterEntry[] {
  return entries.map((entry: any) => {
    const pp = entry.playerPoolEntry ?? {};
    const player = pp.player ?? entry.player ?? {};
    const playerId = player.id ?? entry.playerId ?? 0;
    const fullName =
      player.fullName ??
      (`${player.firstName ?? ""} ${player.lastName ?? ""}`.trim() ||
      `Player ${playerId}`);

    const lineupSlotId = entry.lineupSlotId ?? 16;
    const lineupSlot = ESPN_LINEUP_SLOT_MAP[lineupSlotId] ?? "BE";
    const isStarter = lineupSlot !== "BE" && lineupSlot !== "IL";

    const defaultPositionId = player.defaultPositionId ?? 0;
    const isPitcher = PITCHER_POSITION_IDS.has(defaultPositionId);

    const eligibleSlots: number[] =
      player.eligibleSlots ?? entry.eligibleSlots ?? [];
    const eligiblePositions = [
      ...new Set(
        eligibleSlots
          .map((s: number) => ESPN_POSITION_MAP[s])
          .filter(
            (p: string | undefined): p is string =>
              !!p && p !== "BE" && p !== "IL"
          )
      ),
    ];

    const ownership = player.ownership ?? {};

    const stats = extractCurrentSeasonStats(player.stats ?? []);
    const espnProjection = extractESPNProjection(
      player.stats ?? [],
      totalMatchupPeriods
    );
    const priorYears = extractPriorYearStats(player.stats ?? []);

    return {
      playerId,
      name: fullName,
      eligiblePositions,
      lineupSlot,
      lineupSlotId,
      isStarter,
      isPitcher,
      defaultPositionId,
      injuryStatus: player.injuryStatus ?? null,
      ownership: {
        percentOwned: ownership.percentOwned ?? 0,
        percentStarted: ownership.percentStarted ?? 0,
      },
      acquisitionType: entry.acquisitionType ?? "UNKNOWN",
      acquisitionDate: entry.acquisitionDate ?? 0,
      stats,
      espnProjection,
      priorYears,
      projection: {
        projectedPointsPerWeek: 0,
        stdDev: 0,
        recentForm: 1,
        sampleSize: 0,
        confidence: 0,
        source: "espn_projection",
        espnBaseline: espnProjection.perWeek,
        injuryMultiplier: 1,
      },
    };
  });
}

function extractCurrentSeasonStats(statsArray: any[]): PlayerSeasonStats {
  let totalPoints = 0;
  let gamesPlayed = 0;
  const weeklyScores: WeeklyScore[] = [];

  for (const stat of statsArray) {
    const isCurrentActual =
      stat.statSourceId === 0 &&
      stat.statSplitTypeId === 0 &&
      stat.seasonId === 2026;

    if (isCurrentActual) {
      totalPoints = stat.appliedTotal ?? 0;
      const rawStats = stat.stats ?? {};
      gamesPlayed = rawStats["81"] ?? rawStats["33"] ?? rawStats["0"] ?? 0;
    }

    if (
      stat.statSourceId === 0 &&
      stat.scoringPeriodId &&
      stat.appliedTotal !== undefined &&
      stat.seasonId === 2026
    ) {
      if (!weeklyScores.find((w) => w.matchupPeriod === stat.scoringPeriodId)) {
        weeklyScores.push({
          matchupPeriod: stat.scoringPeriodId,
          points: stat.appliedTotal,
          gamesPlayed: 1,
        });
      }
    }
  }

  return {
    totalPoints,
    gamesPlayed,
    pointsPerGame: gamesPlayed > 0 ? totalPoints / gamesPlayed : 0,
    weeklyScores: weeklyScores.sort((a, b) => a.matchupPeriod - b.matchupPeriod),
  };
}

function extractESPNProjection(
  statsArray: any[],
  totalMatchupPeriods: number
): ESPNPlayerProjection {
  for (const stat of statsArray) {
    if (
      stat.statSourceId === 1 &&
      stat.statSplitTypeId === 0 &&
      stat.seasonId === 2026
    ) {
      const seasonTotal = stat.appliedTotal ?? 0;
      return {
        seasonTotal,
        perWeek:
          totalMatchupPeriods > 0 ? seasonTotal / totalMatchupPeriods : 0,
      };
    }
  }

  return { seasonTotal: 0, perWeek: 0 };
}

function extractPriorYearStats(statsArray: any[]): PriorYearStats[] {
  const years: PriorYearStats[] = [];
  for (const stat of statsArray) {
    if (
      stat.statSourceId === 0 &&
      stat.statSplitTypeId === 0 &&
      stat.seasonId < 2026 &&
      stat.seasonId >= 2022
    ) {
      const tp = stat.appliedTotal ?? 0;
      const rawStats = stat.stats ?? {};
      const gp = rawStats["81"] ?? rawStats["33"] ?? rawStats["0"] ?? 0;
      years.push({
        season: stat.seasonId,
        totalPoints: tp,
        gamesPlayed: gp,
        pointsPerGame: gp > 0 ? tp / gp : 0,
      });
    }
  }
  return years.sort((a, b) => b.season - a.season);
}

export interface RawMatchup {
  matchupPeriodId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  winner: "HOME" | "AWAY" | "UNDECIDED";
}

export function parseMatchups(raw: any): RawMatchup[] {
  const schedule: any[] = raw.schedule ?? [];
  return schedule.map((m: any) => ({
    matchupPeriodId: m.matchupPeriodId,
    homeTeamId: m.home?.teamId ?? 0,
    awayTeamId: m.away?.teamId ?? 0,
    homeScore: m.home?.totalPoints ?? 0,
    awayScore: m.away?.totalPoints ?? 0,
    winner: m.winner ?? "UNDECIDED",
  }));
}

export function buildWeeklyTeamScores(
  matchups: RawMatchup[],
  teamCount: number
): Map<number, Map<number, number>> {
  const teamWeeklyScores = new Map<number, Map<number, number>>();
  for (let i = 1; i <= teamCount; i++) {
    teamWeeklyScores.set(i, new Map());
  }

  for (const m of matchups) {
    if (m.winner === "UNDECIDED" && m.homeScore === 0 && m.awayScore === 0)
      continue;

    const home = teamWeeklyScores.get(m.homeTeamId);
    const away = teamWeeklyScores.get(m.awayTeamId);
    if (home && !home.has(m.matchupPeriodId))
      home.set(m.matchupPeriodId, m.homeScore);
    if (away && !away.has(m.matchupPeriodId))
      away.set(m.matchupPeriodId, m.awayScore);
  }

  return teamWeeklyScores;
}

export interface HistoricalTeamSeason {
  teamId: number;
  teamName: string;
  season: number;
  weeklyScores: Map<number, number>;
  totalPoints: number;
  wins: number;
  losses: number;
}

export function parseHistoricalMatchups(
  raw: any,
  season: number
): HistoricalTeamSeason[] {
  if (!raw) return [];

  const teams: any[] = raw.teams ?? [];
  const schedule: any[] = raw.schedule ?? [];

  const teamMap = new Map<number, HistoricalTeamSeason>();

  for (const t of teams) {
    const rec = t.record?.overall ?? {};
    teamMap.set(t.id, {
      teamId: t.id,
      teamName: t.name ?? `Team ${t.id}`,
      season,
      weeklyScores: new Map(),
      totalPoints: rec.pointsFor ?? t.points ?? 0,
      wins: rec.wins ?? 0,
      losses: rec.losses ?? 0,
    });
  }

  for (const m of schedule) {
    if (m.winner === "UNDECIDED" && !m.home?.totalPoints && !m.away?.totalPoints)
      continue;

    const homeEntry = teamMap.get(m.home?.teamId);
    const awayEntry = teamMap.get(m.away?.teamId);
    if (homeEntry && !homeEntry.weeklyScores.has(m.matchupPeriodId)) {
      homeEntry.weeklyScores.set(m.matchupPeriodId, m.home?.totalPoints ?? 0);
    }
    if (awayEntry && !awayEntry.weeklyScores.has(m.matchupPeriodId)) {
      awayEntry.weeklyScores.set(m.matchupPeriodId, m.away?.totalPoints ?? 0);
    }
  }

  return Array.from(teamMap.values());
}
