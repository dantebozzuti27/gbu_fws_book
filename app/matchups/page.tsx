import { readLatestLeagueData } from "@/lib/s3";
import { MatchupCard } from "@/components/MatchupCard";

export const revalidate = 3600;

export default async function MatchupsPage() {
  const data = await readLatestLeagueData();

  if (!data) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-zinc-400">No data available yet.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-6 lg:max-w-7xl lg:mx-auto lg:px-8">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">Weekly Matchups</h1>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Week {data.meta.currentWeek} betting lines
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-200 mb-3">
          Current Week
        </h2>
        <div className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
          {data.currentMatchups.map((m, i) => (
            <MatchupCard key={i} matchup={m} />
          ))}
        </div>
      </section>

      {data.weeklyHistory.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-sm font-semibold text-zinc-200">
            Previous Weeks
          </h2>
          {data.weeklyHistory
            .slice()
            .reverse()
            .map((week) => (
              <div key={week.matchupPeriod}>
                <h3 className="text-xs font-medium text-zinc-500 mb-2">
                  Week {week.matchupPeriod}
                </h3>
                <div className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
                  {week.matchups.map((m, i) => (
                    <MatchupCard key={i} matchup={m} />
                  ))}
                </div>
              </div>
            ))}
        </section>
      )}
    </div>
  );
}
