"use client";

import type { MatchupOdds } from "@/lib/types";
import { OddsDisplay, ProbabilityBar } from "./OddsDisplay";
import { formatOdds } from "@/lib/odds/utils";

interface MatchupCardProps {
  matchup: MatchupOdds;
}

export function MatchupCard({ matchup }: MatchupCardProps) {
  const { homeTeam, awayTeam, odds, winProbability, projectedScore } = matchup;
  const homeIsFav = winProbability.home > winProbability.away;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
          Week {matchup.matchupPeriod}
        </span>
        <span className="text-xs text-zinc-600">
          O/U {odds.overUnder.total}
        </span>
      </div>

      <div className="space-y-3">
        <TeamRow
          name={awayTeam.teamName}
          projectedScore={projectedScore.away}
          moneyline={odds.moneyline.away}
          winProb={winProbability.away}
          isFav={!homeIsFav}
          spread={homeIsFav ? `+${odds.spread.line}` : `-${odds.spread.line}`}
          powerRating={awayTeam.powerRating}
        />

        <div className="border-t border-zinc-800" />

        <TeamRow
          name={homeTeam.teamName}
          projectedScore={projectedScore.home}
          moneyline={odds.moneyline.home}
          winProb={winProbability.home}
          isFav={homeIsFav}
          spread={homeIsFav ? `-${odds.spread.line}` : `+${odds.spread.line}`}
          powerRating={homeTeam.powerRating}
        />
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-800/50">
        <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
          <span>{Math.round(winProbability.away * 100)}%</span>
          <span className="text-zinc-600">Win Probability</span>
          <span>{Math.round(winProbability.home * 100)}%</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
          <div
            className="bg-blue-500 transition-all duration-500"
            style={{ width: `${winProbability.away * 100}%` }}
          />
          <div
            className="bg-amber-500 transition-all duration-500"
            style={{ width: `${winProbability.home * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function TeamRow({
  name,
  projectedScore,
  moneyline,
  winProb,
  isFav,
  spread,
  powerRating,
}: {
  name: string;
  projectedScore: number;
  moneyline: number;
  winProb: number;
  isFav: boolean;
  spread: string;
  powerRating: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-100 truncate">
            {name}
          </span>
          {isFav && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-medium">
              FAV
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-zinc-500">
            Proj: {projectedScore.toFixed(1)}
          </span>
          <span className="text-xs text-zinc-600">
            PWR: {powerRating.toFixed(0)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 font-mono">{spread}</span>
        <OddsDisplay odds={moneyline} size="sm" />
      </div>
    </div>
  );
}
