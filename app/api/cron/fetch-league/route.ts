import { NextResponse } from "next/server";
import {
  fetchRawLeagueData,
  parseLeagueSettings,
  parseTeams,
  parseMatchups,
  buildWeeklyTeamScores,
} from "@/lib/espn";
import { writeRawData, writeProcessedData } from "@/lib/s3";
import { projectPlayers } from "@/lib/odds/projections";
import { computeTeamProjections } from "@/lib/odds/ratings";
import { computeMatchupOdds } from "@/lib/odds/matchups";
import { runSeasonSimulation } from "@/lib/odds/simulation";
import type { LeagueData } from "@/lib/types";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leagueId = Number(process.env.ESPN_LEAGUE_ID);
    const seasonId = Number(process.env.ESPN_SEASON);
    const espnS2 = process.env.ESPN_S2!;
    const swid = process.env.SWID!;

    const raw = await fetchRawLeagueData({
      leagueId,
      seasonId,
      espnS2,
      swid,
    });

    const today = new Date().toISOString().split("T")[0];
    await writeRawData(raw, today);

    const settings = parseLeagueSettings(raw);
    const teams = parseTeams(raw);
    const rawMatchups = parseMatchups(raw);

    const teamsWithProjections = teams.map((team) => ({
      ...team,
      roster: projectPlayers(team.roster),
    }));

    const teamWeeklyScores = buildWeeklyTeamScores(
      rawMatchups,
      settings.teamCount
    );

    const teamProjections = computeTeamProjections(
      teamsWithProjections,
      teamWeeklyScores
    );

    const currentMatchups = computeMatchupOdds(
      rawMatchups,
      settings.currentMatchupPeriod,
      teamProjections
    );

    const { playoffOdds, championshipOdds, simulationRuns } =
      runSeasonSimulation(
        teamsWithProjections,
        teamProjections,
        settings,
        rawMatchups
      );

    const weeklyHistory = buildWeeklyHistory(
      rawMatchups,
      settings.currentMatchupPeriod,
      teamProjections
    );

    const leagueData: LeagueData = {
      meta: {
        lastUpdated: new Date().toISOString(),
        season: seasonId,
        leagueId,
        leagueName: settings.name,
        currentWeek: settings.currentMatchupPeriod,
        simulationRuns,
      },
      settings,
      teams: teamsWithProjections,
      teamProjections,
      currentMatchups,
      playoffOdds,
      championshipOdds,
      weeklyHistory,
    };

    await writeProcessedData(leagueData, today);

    return NextResponse.json({
      success: true,
      timestamp: leagueData.meta.lastUpdated,
      teamsProcessed: teams.length,
      currentWeek: settings.currentMatchupPeriod,
      matchupsGenerated: currentMatchups.length,
      simulationRuns,
    });
  } catch (err) {
    console.error("Cron fetch-league error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function buildWeeklyHistory(
  matchups: ReturnType<typeof parseMatchups>,
  currentWeek: number,
  teamProjections: ReturnType<typeof computeTeamProjections>
) {
  const history: LeagueData["weeklyHistory"] = [];

  for (let week = 1; week < currentWeek; week++) {
    const weekMatchups = computeMatchupOdds(matchups, week, teamProjections);
    if (weekMatchups.length > 0) {
      history.push({ matchupPeriod: week, matchups: weekMatchups });
    }
  }

  return history;
}
