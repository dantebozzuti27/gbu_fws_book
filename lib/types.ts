export interface ScoringRule {
  statId: number;
  pointsOverride: number;
}

export interface LeagueSettings {
  leagueId: number;
  seasonId: number;
  name: string;
  scoringType: "H2H_POINTS";
  scoringItems: ScoringRule[];
  totalMatchupPeriods: number;
  currentMatchupPeriod: number;
  playoffTeamCount: number;
  playoffStartPeriod: number;
  teamCount: number;
}

export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
  pct: number;
}

export interface Team {
  id: number;
  name: string;
  abbreviation: string;
  owners: string[];
  record: TeamRecord;
  pointsFor: number;
  pointsAgainst: number;
  streakType: "W" | "L" | "T";
  streakLength: number;
  roster: RosterEntry[];
}

export interface RosterEntry {
  playerId: number;
  name: string;
  eligiblePositions: string[];
  lineupSlot: string;
  isStarter: boolean;
  injuryStatus: string | null;
  stats: PlayerSeasonStats;
  projection: PlayerProjection;
}

export interface WeeklyScore {
  matchupPeriod: number;
  points: number;
  gamesPlayed: number;
}

export interface PlayerSeasonStats {
  totalPoints: number;
  gamesPlayed: number;
  pointsPerGame: number;
  weeklyScores: WeeklyScore[];
}

export interface PlayerProjection {
  projectedPointsPerWeek: number;
  stdDev: number;
  recentForm: number;
  sampleSize: number;
  confidence: number;
}

export interface TeamProjection {
  teamId: number;
  teamName: string;
  projectedWeeklyTotal: number;
  stdDev: number;
  powerRating: number;
  rank: number;
}

export interface MatchupSide {
  teamId: number;
  teamName: string;
  projectedScore: number;
  powerRating: number;
}

export interface MoneylineOdds {
  home: number;
  away: number;
}

export interface SpreadOdds {
  favored: "home" | "away";
  line: number;
  homeOdds: number;
  awayOdds: number;
}

export interface OverUnderOdds {
  total: number;
  overOdds: number;
  underOdds: number;
}

export interface MatchupOdds {
  matchupPeriod: number;
  homeTeam: MatchupSide;
  awayTeam: MatchupSide;
  odds: {
    moneyline: MoneylineOdds;
    spread: SpreadOdds;
    overUnder: OverUnderOdds;
  };
  winProbability: { home: number; away: number };
  projectedScore: { home: number; away: number };
}

export interface PlayoffOdds {
  teamId: number;
  teamName: string;
  currentRecord: string;
  gamesBack: number;
  makePlayoffProb: number;
  topSeedProb: number;
  americanOdds: number;
}

export interface ChampionshipOdds {
  teamId: number;
  teamName: string;
  winChampionshipProb: number;
  makeFinalsProb: number;
  makeSemisProb: number;
  americanOdds: number;
}

export interface WeeklyHistoryEntry {
  matchupPeriod: number;
  matchups: MatchupOdds[];
}

export interface LeagueData {
  meta: {
    lastUpdated: string;
    season: number;
    leagueId: number;
    leagueName: string;
    currentWeek: number;
    simulationRuns: number;
  };
  settings: LeagueSettings;
  teams: Team[];
  teamProjections: TeamProjection[];
  currentMatchups: MatchupOdds[];
  playoffOdds: PlayoffOdds[];
  championshipOdds: ChampionshipOdds[];
  weeklyHistory: WeeklyHistoryEntry[];
}

export const ESPN_POSITION_MAP: Record<number, string> = {
  0: "C",
  1: "1B",
  2: "2B",
  3: "3B",
  4: "SS",
  5: "OF",
  6: "OF",
  7: "OF",
  8: "UTIL",
  9: "SP",
  10: "SP",
  11: "RP",
  12: "RP",
  13: "P",
  14: "DH",
  16: "BE",
  17: "IL",
  19: "IF",
  20: "MI",
  21: "CI",
};

export const ESPN_LINEUP_SLOT_MAP: Record<number, string> = {
  0: "C",
  1: "1B",
  2: "2B",
  3: "3B",
  4: "SS",
  5: "OF",
  6: "2B/SS",
  7: "1B/3B",
  12: "UTIL",
  13: "P",
  14: "SP",
  15: "RP",
  16: "BE",
  17: "IL",
  19: "IF",
  20: "MI",
  21: "CI",
};
