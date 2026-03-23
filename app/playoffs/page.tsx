import { readLatestLeagueData } from "@/lib/s3";
import { PlayoffOddsTable } from "@/components/OddsTable";

export const revalidate = 3600;

export default async function PlayoffsPage() {
  const data = await readLatestLeagueData();

  if (!data) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-zinc-400">No data available yet.</p>
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
    <div className="px-4 py-4 space-y-5 lg:max-w-7xl lg:mx-auto lg:px-8">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">Playoff Odds</h1>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          {data.meta.simulationRuns.toLocaleString()} Monte Carlo sims
          &middot; Top {data.settings.playoffTeamCount} qualify
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatBox
          label="Cutoff"
          value={`Top ${data.settings.playoffTeamCount}`}
          sub={`of ${data.settings.teamCount}`}
        />
        <StatBox
          label="Weeks Left"
          value={`${Math.max(0, data.settings.playoffStartPeriod - data.meta.currentWeek)}`}
          sub="reg season"
        />
        <StatBox
          label="Playoffs"
          value={`Wk ${data.settings.playoffStartPeriod}`}
          sub={`thru ${data.settings.totalMatchupPeriods}`}
        />
      </div>

      <section>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              In the Hunt
            </h2>
          </div>
          <PlayoffOddsTable odds={inTheHunt} />
        </div>
      </section>

      {longShots.length > 0 && (
        <section>
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-800/50">
              <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                Long Shots (&lt;1%)
              </h2>
            </div>
            <PlayoffOddsTable odds={longShots} />
          </div>
        </section>
      )}
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-base font-bold text-zinc-100 mt-0.5 font-mono">
        {value}
      </p>
      <p className="text-[10px] text-zinc-600">{sub}</p>
    </div>
  );
}
