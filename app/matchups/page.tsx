import { readLatestLeagueData } from "@/lib/s3";
import { MatchupCard } from "@/components/MatchupCard";

export const revalidate = 3600;

export default async function MatchupsPage() {
  const data = await readLatestLeagueData();

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-zinc-400">No data available yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Weekly Matchups</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Week {data.meta.currentWeek} betting lines
        </p>
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">
          Current Week
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.currentMatchups.map((m, i) => (
            <MatchupCard key={i} matchup={m} />
          ))}
        </div>
      </div>

      {data.weeklyHistory.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            Previous Weeks
          </h2>
          <div className="space-y-8">
            {data.weeklyHistory
              .slice()
              .reverse()
              .map((week) => (
                <div key={week.matchupPeriod}>
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">
                    Week {week.matchupPeriod}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {week.matchups.map((m, i) => (
                      <MatchupCard key={i} matchup={m} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
