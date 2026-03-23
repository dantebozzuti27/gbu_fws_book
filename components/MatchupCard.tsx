"use client";

import type { MatchupOdds } from "@/lib/types";
import { formatOdds } from "@/lib/odds/utils";

interface MatchupCardProps {
  matchup: MatchupOdds;
}

export function MatchupCard({ matchup }: MatchupCardProps) {
  const { homeTeam, awayTeam, odds, winProbability, projectedScore } = matchup;
  const homeIsFav = winProbability.home > winProbability.away;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/30">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
          Week {matchup.matchupPeriod}
        </span>
        <span className="text-[11px] text-zinc-600 font-mono">
          O/U {odds.overUnder.total}
        </span>
      </div>

      <div className="px-3 py-2.5 space-y-2">
        <MobileTeamRow
          name={awayTeam.teamName}
          projected={projectedScore.away}
          moneyline={odds.moneyline.away}
          spreadLabel={homeIsFav ? `+${odds.spread.line}` : `-${odds.spread.line}`}
          spreadOdds={odds.spread.awayOdds}
          isFav={!homeIsFav}
        />
        <div className="border-t border-zinc-800/60" />
        <MobileTeamRow
          name={homeTeam.teamName}
          projected={projectedScore.home}
          moneyline={odds.moneyline.home}
          spreadLabel={homeIsFav ? `-${odds.spread.line}` : `+${odds.spread.line}`}
          spreadOdds={odds.spread.homeOdds}
          isFav={homeIsFav}
        />
      </div>

      <div className="px-3 pb-3">
        <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
          <span>{Math.round(winProbability.away * 100)}%</span>
          <span>{Math.round(winProbability.home * 100)}%</span>
        </div>
        <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800">
          <div
            className="bg-blue-500 transition-all duration-300"
            style={{ width: `${winProbability.away * 100}%` }}
          />
          <div
            className="bg-amber-500 transition-all duration-300"
            style={{ width: `${winProbability.home * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function MobileTeamRow({
  name,
  projected,
  moneyline,
  spreadLabel,
  spreadOdds,
  isFav,
}: {
  name: string;
  projected: number;
  moneyline: number;
  spreadLabel: string;
  spreadOdds: number;
  isFav: boolean;
}) {
  return (
    <div className="flex items-center justify-between min-h-[40px]">
      <div className="flex-1 min-w-0 mr-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-zinc-100 truncate">
            {name}
          </span>
          {isFav && (
            <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-px rounded font-semibold shrink-0">
              FAV
            </span>
          )}
        </div>
        <span className="text-[11px] text-zinc-500">
          Proj {projected.toFixed(0)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="text-right">
          <div className="text-[11px] text-zinc-500 font-mono leading-none">
            {spreadLabel} <span className="text-zinc-600">({formatOdds(spreadOdds)})</span>
          </div>
        </div>
        <span
          className={`text-[13px] font-mono font-semibold px-2 py-1 rounded min-w-[52px] text-center ${
            moneyline < 0
              ? "bg-emerald-900/40 text-emerald-400"
              : "bg-red-900/30 text-red-400"
          }`}
        >
          {formatOdds(moneyline)}
        </span>
      </div>
    </div>
  );
}
