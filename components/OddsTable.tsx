"use client";

import type { PlayoffOdds, ChampionshipOdds } from "@/lib/types";
import { OddsDisplay, ProbabilityBar } from "./OddsDisplay";

interface PlayoffOddsTableProps {
  odds: PlayoffOdds[];
}

export function PlayoffOddsTable({ odds }: PlayoffOddsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
            <th className="text-left py-3 px-4">#</th>
            <th className="text-left py-3 px-4">Team</th>
            <th className="text-left py-3 px-4">Record</th>
            <th className="text-right py-3 px-4">GB</th>
            <th className="text-right py-3 px-4">Probability</th>
            <th className="text-right py-3 px-4">Odds</th>
            <th className="text-left py-3 px-4 w-32">Chance</th>
          </tr>
        </thead>
        <tbody>
          {odds.map((team, i) => (
            <tr
              key={team.teamId}
              className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
            >
              <td className="py-3 px-4 text-zinc-500 font-mono">{i + 1}</td>
              <td className="py-3 px-4 font-medium text-zinc-100">
                {team.teamName}
              </td>
              <td className="py-3 px-4 text-zinc-400 font-mono">
                {team.currentRecord}
              </td>
              <td className="py-3 px-4 text-right text-zinc-500 font-mono">
                {team.gamesBack === 0 ? "—" : team.gamesBack.toFixed(1)}
              </td>
              <td className="py-3 px-4 text-right font-mono text-zinc-300">
                {(team.makePlayoffProb * 100).toFixed(1)}%
              </td>
              <td className="py-3 px-4 text-right">
                <OddsDisplay odds={team.americanOdds} size="sm" />
              </td>
              <td className="py-3 px-4">
                <ProbabilityBar probability={team.makePlayoffProb} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ChampionshipOddsTableProps {
  odds: ChampionshipOdds[];
}

export function ChampionshipOddsTable({ odds }: ChampionshipOddsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
            <th className="text-left py-3 px-4">#</th>
            <th className="text-left py-3 px-4">Team</th>
            <th className="text-right py-3 px-4">Win Title</th>
            <th className="text-right py-3 px-4">Make Finals</th>
            <th className="text-right py-3 px-4">Make Semis</th>
            <th className="text-right py-3 px-4">Odds</th>
            <th className="text-left py-3 px-4 w-32">Chance</th>
          </tr>
        </thead>
        <tbody>
          {odds.map((team, i) => (
            <tr
              key={team.teamId}
              className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
            >
              <td className="py-3 px-4 text-zinc-500 font-mono">{i + 1}</td>
              <td className="py-3 px-4 font-medium text-zinc-100">
                {team.teamName}
              </td>
              <td className="py-3 px-4 text-right font-mono text-zinc-300">
                {(team.winChampionshipProb * 100).toFixed(1)}%
              </td>
              <td className="py-3 px-4 text-right font-mono text-zinc-400">
                {(team.makeFinalsProb * 100).toFixed(1)}%
              </td>
              <td className="py-3 px-4 text-right font-mono text-zinc-500">
                {(team.makeSemisProb * 100).toFixed(1)}%
              </td>
              <td className="py-3 px-4 text-right">
                <OddsDisplay odds={team.americanOdds} size="sm" />
              </td>
              <td className="py-3 px-4">
                <ProbabilityBar probability={team.winChampionshipProb} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
