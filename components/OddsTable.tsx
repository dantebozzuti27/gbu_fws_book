"use client";

import type { PlayoffOdds, ChampionshipOdds } from "@/lib/types";
import { OddsDisplay, ProbabilityBar } from "./OddsDisplay";

interface PlayoffOddsTableProps {
  odds: PlayoffOdds[];
}

export function PlayoffOddsTable({ odds }: PlayoffOddsTableProps) {
  return (
    <div className="divide-y divide-zinc-800/50">
      {odds.map((team, i) => (
        <div
          key={team.teamId}
          className="flex items-center gap-3 px-4 py-3 min-h-[52px] active:bg-zinc-800/30"
        >
          <span className="text-xs text-zinc-600 font-mono w-4 shrink-0 text-right">
            {i + 1}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-zinc-100 truncate">
                {team.teamName}
              </span>
              <OddsDisplay odds={team.americanOdds} size="sm" />
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[11px] text-zinc-400 font-mono">
                {team.currentRecord}
              </span>
              {team.gamesBack > 0 && (
                <span className="text-[11px] text-zinc-600 font-mono">
                  {team.gamesBack.toFixed(1)} GB
                </span>
              )}
              <span className="text-[11px] text-zinc-300 font-mono">
                {(team.makePlayoffProb * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5">
              <ProbabilityBar probability={team.makePlayoffProb} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ChampionshipOddsTableProps {
  odds: ChampionshipOdds[];
}

export function ChampionshipOddsTable({ odds }: ChampionshipOddsTableProps) {
  return (
    <div className="divide-y divide-zinc-800/50">
      {odds.map((team, i) => (
        <div
          key={team.teamId}
          className="flex items-center gap-3 px-4 py-3 min-h-[52px] active:bg-zinc-800/30"
        >
          <span className="text-xs text-zinc-600 font-mono w-4 shrink-0 text-right">
            {i + 1}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-zinc-100 truncate">
                {team.teamName}
              </span>
              <OddsDisplay odds={team.americanOdds} size="sm" />
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] font-mono">
              <span className="text-zinc-300">
                Win {(team.winChampionshipProb * 100).toFixed(1)}%
              </span>
              <span className="text-zinc-500">
                Finals {(team.makeFinalsProb * 100).toFixed(1)}%
              </span>
              <span className="text-zinc-600">
                Semis {(team.makeSemisProb * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5">
              <ProbabilityBar probability={team.winChampionshipProb} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
