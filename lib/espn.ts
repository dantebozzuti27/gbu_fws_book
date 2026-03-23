import {
  type Team,
  type RosterEntry,
  type PlayerSeasonStats,
  type WeeklyScore,
  type LeagueSettings,
  type ScoringRule,
  ESPN_LINEUP_SLOT_MAP,
  ESPN_POSITION_MAP,
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

export async function fetchRawLeagueData(
  opts: ESPNFetchOptions
): Promise<any> {
  const url = new URL(
    `${ESPN_API_BASE}/${opts.seasonId}/segments/0/leagues/${opts.leagueId}`
  );

  const views = [
    "mTeam",
    "mRoster",
    "mSettings",
    "mMatchup",
    "mMatchupScore",
    "mStandings",
  ];
  views.forEach((v) => url.searchParams.append("view", v));

  const res = await fetch(url.toString(), {
    headers: {
      Cookie: `espn_s2=${opts.espnS2}; SWID=${opts.swid}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `ESPN API returned ${res.status}: ${await res.text()}`
    );
  }

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

  const playoffSettings = schedule?.playoffMatchupPeriodLength
    ? schedule
    : s.playoffSettings ?? {};

  const playoffTeamCount =
    playoffSettings?.playoffTeamCount ??
    s.playoffSettings?.playoffTeamCount ??
    4;

  const playoffMatchupPeriods =
    playoffSettings?.playoffMatchupPeriodLength ?? 1;

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
    currentMatchupPeriod: raw.scoringPeriodId ?? raw.status?.currentMatchupPeriod ?? 1,
    playoffTeamCount,
    playoffStartPeriod,
    teamCount: raw.teams?.length ?? s.size ?? 10,
  };
}

export function parseTeams(raw: any): Team[] {
  const teams: any[] = raw.teams ?? [];

  return teams.map((t: any) => {
    const record = t.record?.overall ?? {};
    const totalWins = record.wins ?? 0;
    const totalLosses = record.losses ?? 0;
    const totalTies = record.ties ?? 0;
    const totalGames = totalWins + totalLosses + totalTies;

    const roster: RosterEntry[] = parseRoster(t.roster?.entries ?? []);

    return {
      id: t.id,
      name: t.name ?? t.location + " " + t.nickname,
      abbreviation: t.abbrev ?? "???",
      owners: t.owners?.map((o: any) =>
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
      streakType: record.streakType === 2 ? "L" : record.streakType === 3 ? "T" : "W",
      streakLength: record.streakLength ?? 0,
      roster,
    };
  });
}

function parseRoster(entries: any[]): RosterEntry[] {
  return entries.map((entry: any) => {
    const player = entry.playerPoolEntry?.player ?? entry.player ?? {};
    const playerId = player.id ?? entry.playerId ?? 0;
    const fullName = player.fullName ?? player.firstName
      ? `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim()
      : `Player ${playerId}`;

    const lineupSlotId = entry.lineupSlotId ?? 16;
    const lineupSlot = ESPN_LINEUP_SLOT_MAP[lineupSlotId] ?? "BE";
    const isStarter = lineupSlot !== "BE" && lineupSlot !== "IL";

    const eligibleSlots: number[] = player.eligibleSlots ?? entry.eligibleSlots ?? [];
    const eligiblePositions = eligibleSlots
      .map((s: number) => ESPN_POSITION_MAP[s])
      .filter((p: string | undefined): p is string => !!p && p !== "BE" && p !== "IL");
    const uniquePositions = [...new Set(eligiblePositions)];

    const stats = extractPlayerStats(player.stats ?? [], entry);

    return {
      playerId,
      name: fullName,
      eligiblePositions: uniquePositions,
      lineupSlot,
      isStarter,
      injuryStatus: player.injuryStatus ?? null,
      stats,
      projection: {
        projectedPointsPerWeek: 0,
        stdDev: 0,
        recentForm: 1,
        sampleSize: 0,
        confidence: 0,
      },
    };
  });
}

function extractPlayerStats(
  statsArray: any[],
  _entry: any
): PlayerSeasonStats {
  let totalPoints = 0;
  let gamesPlayed = 0;
  const weeklyScores: WeeklyScore[] = [];

  for (const stat of statsArray) {
    if (stat.id === "002026" || stat.statSourceId === 0) {
      totalPoints = stat.appliedTotal ?? 0;
      const rawStats = stat.stats ?? {};
      gamesPlayed = rawStats["81"] ?? rawStats["0"] ?? 0;
    }

    if (stat.scoringPeriodId && stat.appliedTotal !== undefined) {
      const existing = weeklyScores.find(
        (w) => w.matchupPeriod === stat.scoringPeriodId
      );
      if (!existing) {
        weeklyScores.push({
          matchupPeriod: stat.scoringPeriodId,
          points: stat.appliedTotal,
          gamesPlayed: 1,
        });
      }
    }
  }

  const pointsPerGame = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;

  return {
    totalPoints,
    gamesPlayed,
    pointsPerGame,
    weeklyScores: weeklyScores.sort(
      (a, b) => a.matchupPeriod - b.matchupPeriod
    ),
  };
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
    if (m.winner === "UNDECIDED" && m.homeScore === 0 && m.awayScore === 0) {
      continue;
    }

    const homeScores = teamWeeklyScores.get(m.homeTeamId);
    const awayScores = teamWeeklyScores.get(m.awayTeamId);

    if (homeScores && !homeScores.has(m.matchupPeriodId)) {
      homeScores.set(m.matchupPeriodId, m.homeScore);
    }
    if (awayScores && !awayScores.has(m.matchupPeriodId)) {
      awayScores.set(m.matchupPeriodId, m.awayScore);
    }
  }

  return teamWeeklyScores;
}
