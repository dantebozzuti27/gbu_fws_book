import type { MatchupOdds, TeamProjection } from "../types";
import type { RawMatchup } from "../espn";
import { normalCDF, probabilityToAmericanOdds, roundToHalf } from "./utils";

const STANDARD_JUICE = -110;

/**
 * Compute betting odds for all matchups in a given week.
 *
 * For each matchup (Team A vs Team B):
 * - Model scores as independent normals: X_A ~ N(μ_A, σ_A), X_B ~ N(μ_B, σ_B)
 * - Win probability: P(A > B) = Φ((μ_A - μ_B) / √(σ_A² + σ_B²))
 * - Moneyline: probability → American odds with vig
 * - Spread: μ_A - μ_B, rounded to 0.5
 * - Over/Under: μ_A + μ_B, rounded to 0.5
 */
export function computeMatchupOdds(
  matchups: RawMatchup[],
  weekNumber: number,
  teamProjections: TeamProjection[]
): MatchupOdds[] {
  const projMap = new Map(teamProjections.map((p) => [p.teamId, p]));

  const weekMatchups = matchups.filter(
    (m) => m.matchupPeriodId === weekNumber
  );

  return weekMatchups.map((m) => {
    const homeProj = projMap.get(m.homeTeamId);
    const awayProj = projMap.get(m.awayTeamId);

    if (!homeProj || !awayProj) {
      return buildDefaultMatchupOdds(m, weekNumber);
    }

    const muHome = homeProj.projectedWeeklyTotal;
    const muAway = awayProj.projectedWeeklyTotal;
    const sigHome = homeProj.stdDev;
    const sigAway = awayProj.stdDev;

    const combinedSig = Math.sqrt(sigHome ** 2 + sigAway ** 2);
    const zScore = combinedSig > 0 ? (muHome - muAway) / combinedSig : 0;
    const homeWinProb = normalCDF(zScore);
    const awayWinProb = 1 - homeWinProb;

    const spreadRaw = muHome - muAway;
    const spreadLine = roundToHalf(spreadRaw);
    const favored: "home" | "away" = spreadRaw >= 0 ? "home" : "away";

    const totalRaw = muHome + muAway;
    const totalLine = roundToHalf(totalRaw);

    return {
      matchupPeriod: weekNumber,
      homeTeam: {
        teamId: m.homeTeamId,
        teamName: homeProj.teamName,
        projectedScore: Math.round(muHome * 10) / 10,
        powerRating: homeProj.powerRating,
      },
      awayTeam: {
        teamId: m.awayTeamId,
        teamName: awayProj.teamName,
        projectedScore: Math.round(muAway * 10) / 10,
        powerRating: awayProj.powerRating,
      },
      odds: {
        moneyline: {
          home: probabilityToAmericanOdds(homeWinProb),
          away: probabilityToAmericanOdds(awayWinProb),
        },
        spread: {
          favored,
          line: Math.abs(spreadLine),
          homeOdds: STANDARD_JUICE,
          awayOdds: STANDARD_JUICE,
        },
        overUnder: {
          total: totalLine,
          overOdds: STANDARD_JUICE,
          underOdds: STANDARD_JUICE,
        },
      },
      winProbability: {
        home: Math.round(homeWinProb * 1000) / 1000,
        away: Math.round(awayWinProb * 1000) / 1000,
      },
      projectedScore: {
        home: Math.round(muHome * 10) / 10,
        away: Math.round(muAway * 10) / 10,
      },
    };
  });
}

function buildDefaultMatchupOdds(
  m: RawMatchup,
  weekNumber: number
): MatchupOdds {
  return {
    matchupPeriod: weekNumber,
    homeTeam: {
      teamId: m.homeTeamId,
      teamName: `Team ${m.homeTeamId}`,
      projectedScore: 0,
      powerRating: 50,
    },
    awayTeam: {
      teamId: m.awayTeamId,
      teamName: `Team ${m.awayTeamId}`,
      projectedScore: 0,
      powerRating: 50,
    },
    odds: {
      moneyline: { home: -110, away: -110 },
      spread: { favored: "home", line: 0, homeOdds: -110, awayOdds: -110 },
      overUnder: { total: 0, overOdds: -110, underOdds: -110 },
    },
    winProbability: { home: 0.5, away: 0.5 },
    projectedScore: { home: 0, away: 0 },
  };
}
