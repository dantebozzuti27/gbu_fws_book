import { readLatestLeagueData } from "@/lib/s3";
import { ChampionshipOddsTable } from "@/components/OddsTable";
import { formatOdds } from "@/lib/odds/utils";

export const revalidate = 1800;

export default async function ChampionshipPage() {
  const data = await readLatestLeagueData();

  if (!data) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-zinc-400">No data available yet.</p>
      </div>
    );
  }

  const favorite = data.championshipOdds[0];
  const contenders = data.championshipOdds.filter(
    (t) => t.winChampionshipProb >= 0.05
  );

  return (
    <div className="px-4 py-4 space-y-5 lg:max-w-7xl lg:mx-auto lg:px-8">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">
          Championship Futures
        </h1>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Season-long odds &middot;{" "}
          {data.meta.simulationRuns.toLocaleString()} sims
        </p>
      </div>

      {favorite && (
        <div className="bg-gradient-to-br from-emerald-900/20 to-zinc-900 border border-emerald-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-medium mb-0.5">
                Favorite
              </p>
              <h2 className="text-base font-bold text-zinc-100 truncate">
                {favorite.teamName}
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {(favorite.winChampionshipProb * 100).toFixed(1)}% to win it
                all
              </p>
            </div>
            <div className="text-right shrink-0 ml-3">
              <div
                className={`text-2xl font-bold font-mono ${
                  favorite.americanOdds < 0
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {formatOdds(favorite.americanOdds)}
              </div>
              <p className="text-[10px] text-zinc-600 mt-0.5">Title Odds</p>
            </div>
          </div>
        </div>
      )}

      <section>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Full Futures Board
            </h2>
          </div>
          <ChampionshipOddsTable odds={data.championshipOdds} />
        </div>
      </section>

      {contenders.length > 1 && (
        <section>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Contender Breakdown
            </h3>
            <div className="space-y-3">
              {contenders.map((team) => {
                const champPct = team.winChampionshipProb * 100;

                return (
                  <div key={team.teamId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-zinc-200 font-medium truncate">
                        {team.teamName}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono shrink-0 ml-2">
                        {champPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, champPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
