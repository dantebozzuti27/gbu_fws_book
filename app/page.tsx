import { readLatestLeagueData } from "@/lib/s3";
import { MatchupCard } from "@/components/MatchupCard";
import { TeamCard } from "@/components/TeamCard";
import { formatOdds } from "@/lib/odds/utils";
import Link from "next/link";

export const revalidate = 1800;

export default async function Home() {
  const data = await readLatestLeagueData();

  if (!data) {
    return (
      <div className="px-4 py-12">
        <div className="text-center">
          <h1 className="text-xl font-bold text-zinc-100 mb-3">
            Fantasy Sportsbook
          </h1>
          <p className="text-sm text-zinc-400 mb-6">
            No league data yet. Trigger the cron job or wait for the daily
            fetch.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left max-w-sm mx-auto">
            <h3 className="text-xs font-medium text-zinc-300 mb-2">
              Quick Start
            </h3>
            <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
              <li>Set ESPN_S2 and SWID env vars</li>
              <li>
                Hit{" "}
                <code className="text-emerald-400 text-[11px]">
                  /api/cron/fetch-league
                </code>
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
    <div className="px-4 py-4 space-y-6 lg:max-w-7xl lg:mx-auto lg:px-8">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">
          {data.meta.leagueName}
        </h1>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Week {data.meta.currentWeek} &middot;{" "}
          {new Date(data.meta.lastUpdated).toLocaleDateString()} &middot;{" "}
          {data.meta.simulationRuns.toLocaleString()} sims
        </p>
      </div>

      <section>
        <SectionHeader title="This Week's Lines" href="/matchups" />
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {topMatchups.map((m, i) => (
            <MatchupCard key={i} matchup={m} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Power Rankings" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 divide-y divide-zinc-800/50">
          {topTeams.map((tp) => (
            <TeamCard key={tp.teamId} projection={tp} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Title Favorites" href="/championship" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {topChampOdds.map((team, i) => (
            <div
              key={team.teamId}
              className={`flex items-center justify-between px-4 py-3 min-h-[44px] ${
                i < topChampOdds.length - 1
                  ? "border-b border-zinc-800/50"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs text-zinc-600 font-mono w-4 shrink-0 text-right">
                  {i + 1}
                </span>
                <span className="text-[13px] text-zinc-200 truncate">
                  {team.teamName}
                </span>
              </div>
              <span
                className={`text-[13px] font-mono font-semibold shrink-0 ${
                  team.americanOdds < 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {formatOdds(team.americanOdds)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      {href && (
        <Link
          href={href}
          className="text-xs text-emerald-400 active:text-emerald-300 min-h-[44px] flex items-center"
        >
          View all
        </Link>
      )}
    </div>
  );
}
