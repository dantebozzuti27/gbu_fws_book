import { readLatestLeagueData } from "@/lib/s3";
import { MatchupCard } from "@/components/MatchupCard";
import { TeamCard } from "@/components/TeamCard";
import Link from "next/link";

export const revalidate = 3600;

export default async function Home() {
  const data = await readLatestLeagueData();

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-100 mb-4">
            Fantasy Sportsbook
          </h1>
          <p className="text-zinc-400 mb-8">
            No league data yet. Trigger the cron job or wait for the daily fetch.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md mx-auto text-left">
            <h3 className="text-sm font-medium text-zinc-300 mb-2">
              Quick Start
            </h3>
            <ol className="text-sm text-zinc-500 space-y-1 list-decimal list-inside">
              <li>Set ESPN_S2 and SWID environment variables</li>
              <li>
                Hit{" "}
                <code className="text-emerald-400 text-xs">
                  /api/cron/fetch-league
                </code>{" "}
                to trigger data fetch
              </li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const topMatchups = data.currentMatchups.slice(0, 4);
  const topTeams = data.teamProjections.slice(0, 6);
  const topChampOdds = data.championshipOdds.slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">
          {data.meta.leagueName}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Week {data.meta.currentWeek} &middot; Last updated{" "}
          {new Date(data.meta.lastUpdated).toLocaleDateString()} &middot;{" "}
          {data.meta.simulationRuns.toLocaleString()} simulations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-200">
              This Week&apos;s Lines
            </h2>
            <Link
              href="/matchups"
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topMatchups.map((m, i) => (
              <MatchupCard key={i} matchup={m} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-zinc-200">
            Power Rankings
          </h2>
          <div className="space-y-3">
            {topTeams.map((tp) => (
              <TeamCard key={tp.teamId} projection={tp} />
            ))}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-zinc-200">
                Title Favorites
              </h2>
              <Link
                href="/championship"
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                Full board
              </Link>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              {topChampOdds.map((team, i) => (
                <div
                  key={team.teamId}
                  className={`flex items-center justify-between px-4 py-2.5 ${
                    i < topChampOdds.length - 1
                      ? "border-b border-zinc-800/50"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600 font-mono w-4">
                      {i + 1}
                    </span>
                    <span className="text-sm text-zinc-200">
                      {team.teamName}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-mono ${
                      team.americanOdds < 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {team.americanOdds > 0
                      ? `+${team.americanOdds}`
                      : team.americanOdds}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
