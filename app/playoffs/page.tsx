import { readLatestLeagueData } from "@/lib/s3";
import { PlayoffOddsTable } from "@/components/OddsTable";

export const revalidate = 3600;

export default async function PlayoffsPage() {
  const data = await readLatestLeagueData();

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-zinc-400">No data available yet.</p>
      </div>
    );
  }

  const inTheHunt = data.playoffOdds.filter(
    (t) => t.makePlayoffProb > 0.01
  );
  const longShots = data.playoffOdds.filter(
    (t) => t.makePlayoffProb <= 0.01
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">
          Playoff Odds
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Based on {data.meta.simulationRuns.toLocaleString()} Monte Carlo
          simulations of the remaining schedule &middot; Top{" "}
          {data.settings.playoffTeamCount} teams qualify
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            In the Hunt
          </h2>
        </div>
        <PlayoffOddsTable odds={inTheHunt} />
      </div>

      {longShots.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800/50">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Long Shots (&lt;1%)
            </h2>
          </div>
          <PlayoffOddsTable odds={longShots} />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatBox
          label="Playoff Cutoff"
          value={`Top ${data.settings.playoffTeamCount}`}
          sub={`of ${data.settings.teamCount} teams`}
        />
        <StatBox
          label="Weeks Remaining"
          value={`${Math.max(0, data.settings.playoffStartPeriod - data.meta.currentWeek)}`}
          sub="regular season"
        />
        <StatBox
          label="Playoff Start"
          value={`Week ${data.settings.playoffStartPeriod}`}
          sub={`through Week ${data.settings.totalMatchupPeriods}`}
        />
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-zinc-100 mt-1 font-mono">
        {value}
      </p>
      <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>
    </div>
  );
}
