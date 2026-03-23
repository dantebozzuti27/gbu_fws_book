import { readLatestLeagueData } from "@/lib/s3";
import { ChampionshipOddsTable } from "@/components/OddsTable";

export const revalidate = 3600;

export default async function ChampionshipPage() {
  const data = await readLatestLeagueData();

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-zinc-400">No data available yet.</p>
      </div>
    );
  }

  const favorite = data.championshipOdds[0];
  const contenders = data.championshipOdds.filter(
    (t) => t.winChampionshipProb >= 0.05
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">
          Championship Futures
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Season-long odds to win the title &middot;{" "}
          {data.meta.simulationRuns.toLocaleString()} simulations
        </p>
      </div>

      {favorite && (
        <div className="bg-gradient-to-br from-emerald-900/20 to-zinc-900 border border-emerald-800/30 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-400 uppercase tracking-wider font-medium mb-1">
                Current Favorite
              </p>
              <h2 className="text-xl font-bold text-zinc-100">
                {favorite.teamName}
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                {(favorite.winChampionshipProb * 100).toFixed(1)}% chance to win
                it all
              </p>
            </div>
            <div className="text-right">
              <div
                className={`text-3xl font-bold font-mono ${
                  favorite.americanOdds < 0
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {favorite.americanOdds > 0
                  ? `+${favorite.americanOdds}`
                  : favorite.americanOdds}
              </div>
              <p className="text-xs text-zinc-600 mt-1">
                Championship Odds
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Full Futures Board
          </h2>
        </div>
        <ChampionshipOddsTable odds={data.championshipOdds} />
      </div>

      {contenders.length > 1 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">
            Contender Breakdown
          </h3>
          <div className="space-y-3">
            {contenders.map((team) => {
              const champPct = team.winChampionshipProb * 100;
              const finalsPct = team.makeFinalsProb * 100;
              const semisPct = team.makeSemisProb * 100;

              return (
                <div key={team.teamId} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-200 font-medium">
                      {team.teamName}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      {champPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-zinc-800 gap-px">
                    <div
                      className="bg-emerald-500 rounded-l-full"
                      style={{ width: `${champPct}%` }}
                      title={`Win: ${champPct.toFixed(1)}%`}
                    />
                    <div
                      className="bg-amber-500"
                      style={{
                        width: `${Math.max(0, finalsPct - champPct)}%`,
                      }}
                      title={`Finals: ${finalsPct.toFixed(1)}%`}
                    />
                    <div
                      className="bg-zinc-600 rounded-r-full"
                      style={{
                        width: `${Math.max(0, semisPct - finalsPct)}%`,
                      }}
                      title={`Semis: ${semisPct.toFixed(1)}%`}
                    />
                  </div>
                  <div className="flex gap-4 text-[10px] text-zinc-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Win
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      Finals
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-zinc-600 inline-block" />
                      Semis
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
