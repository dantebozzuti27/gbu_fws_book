import { NextResponse } from "next/server";
import {
  fetchRawLeagueData,
  fetchHistoricalSeason,
  parseLeagueSettings,
  parseTeams,
  parseMatchups,
  parseHistoricalMatchups,
  buildWeeklyTeamScores,
} from "@/lib/espn";
import type { HistoricalTeamSeason } from "@/lib/espn";
import {
  writeRawData,
  writeProcessedData,
  writeHistoricalData,
  readHistoricalData,
} from "@/lib/s3";
import { projectPlayers } from "@/lib/odds/projections";
import { applyInjuryAdjustments } from "@/lib/odds/injuries";
import { computeManagerProfiles } from "@/lib/odds/manager";
import { analyzeLineup } from "@/lib/odds/lineup";
import { computeTeamProjections } from "@/lib/odds/ratings";
import { computeStrengthOfSchedule } from "@/lib/odds/schedule";
import { computeMatchupOdds } from "@/lib/odds/matchups";
import { runSeasonSimulation } from "@/lib/odds/simulation";
import type { LeagueData, LineupEfficiency } from "@/lib/types";

export const maxDuration = 120;

const HISTORICAL_YEARS = [2022, 2023, 2024, 2025];

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && cronSecret !== "your_cron_secret_here" && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leagueId = Number(process.env.ESPN_LEAGUE_ID);
    const seasonId = Number(process.env.ESPN_SEASON);
    const espnS2 = process.env.ESPN_S2!;
    const swid = process.env.SWID!;

    const fetchOpts = { leagueId, seasonId, espnS2, swid };

    const raw = await fetchRawLeagueData(fetchOpts);
    const today = new Date().toISOString().split("T")[0];
    await writeRawData(raw, today);

    const settings = parseLeagueSettings(raw);
    const teams = parseTeams(raw, settings.totalMatchupPeriods);
    const rawMatchups = parseMatchups(raw);
    const currentWeek = settings.currentMatchupPeriod;

    const historicalSeasons: HistoricalTeamSeason[] = [];
    for (const year of HISTORICAL_YEARS) {
      let cached = await readHistoricalData(year);
      if (!cached) {
        const histRaw = await fetchHistoricalSeason(fetchOpts, year);
        if (histRaw) {
          await writeHistoricalData(histRaw, year);
          cached = histRaw;
        }
      }
      if (cached) {
        historicalSeasons.push(...parseHistoricalMatchups(cached, year));
      }
    }

    const teamsWithProjections = teams.map((team) => {
      let roster = applyInjuryAdjustments(team.roster);
      roster = projectPlayers(roster, currentWeek, settings.totalMatchupPeriods);
      return { ...team, roster };
    });

    const weeksElapsed = Math.max(1, currentWeek - 1);
    const managerProfiles = computeManagerProfiles(teamsWithProjections, weeksElapsed);

    const lineupEfficiencies: LineupEfficiency[] = teamsWithProjections.map(
      (team) => analyzeLineup(team.roster, team.id)
    );

    const teamWeeklyScores = buildWeeklyTeamScores(
      rawMatchups,
      settings.teamCount
    );

    const teamProjections = computeTeamProjections(
      teamsWithProjections,
      managerProfiles,
      lineupEfficiencies,
      teamWeeklyScores
    );

    const sosMap = computeStrengthOfSchedule(
      teamProjections,
      rawMatchups,
      currentWeek,
      settings.playoffStartPeriod - 1
    );

    const teamProjectionsWithSoS = teamProjections.map((tp) => ({
      ...tp,
      strengthOfSchedule: sosMap.get(tp.teamId) ?? 50,
    }));

    const currentMatchups = computeMatchupOdds(
      rawMatchups,
      currentWeek,
      teamProjectionsWithSoS
    );

    const { playoffOdds, championshipOdds, simulationRuns } =
      runSeasonSimulation(
        teamsWithProjections,
        teamProjectionsWithSoS,
        settings,
        rawMatchups
      );

    const weeklyHistory = buildWeeklyHistory(
      rawMatchups,
      currentWeek,
      teamProjectionsWithSoS
    );

    const leagueData: LeagueData = {
      meta: {
        lastUpdated: new Date().toISOString(),
        season: seasonId,
        leagueId,
        leagueName: settings.name,
        currentWeek,
        simulationRuns,
      },
      settings,
      teams: teamsWithProjections,
      teamProjections: teamProjectionsWithSoS,
      managerProfiles,
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
      currentWeek,
      matchupsGenerated: currentMatchups.length,
      simulationRuns,
      historicalSeasonsLoaded: historicalSeasons.length > 0 ? HISTORICAL_YEARS.length : 0,
      managerProfilesGenerated: managerProfiles.length,
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
