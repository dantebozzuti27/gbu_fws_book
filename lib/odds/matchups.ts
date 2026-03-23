import type { MatchupOdds, TeamProjection } from "../types";
import type { RawMatchup } from "../espn";
import { normalCDF, probabilityToAmericanOdds, roundToHalf } from "./utils";

const STANDARD_JUICE = -110;

/**
 * Compute betting odds for all matchups in a given week.
 *
 * For each matchup (Team A vs Team B):
 * - Model scores as independent normals: X_A ~ N(mu_A, sig_A), X_B ~ N(mu_B, sig_B)
 * - Win probability: P(A > B) = Phi((mu_A - mu_B) / sqrt(sig_A^2 + sig_B^2))
 * - Moneyline: probability -> American odds with vig
 * - Spread: mu_A - mu_B, rounded to 0.5
 * - Over/Under: mu_A + mu_B, rounded to 0.5
 *
 * Skips matchups where either team has no projection data — no fake fallbacks.
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

  const results: MatchupOdds[] = [];

  for (const m of weekMatchups) {
    const homeProj = projMap.get(m.homeTeamId);
    const awayProj = projMap.get(m.awayTeamId);
    if (!homeProj || !awayProj) continue;

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

    results.push({
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
    });
  }

  return results;
}
