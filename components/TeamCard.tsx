"use client";

import type { TeamProjection } from "@/lib/types";

interface TeamCardProps {
  projection: TeamProjection;
}

export function TeamCard({ projection }: TeamCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-100">
            {projection.teamName}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Proj: {projection.projectedWeeklyTotal.toFixed(1)} pts/wk
          </p>
        </div>
        <div className="text-right">
          <div
            className={`text-2xl font-bold font-mono ${
              projection.powerRating >= 70
                ? "text-emerald-400"
                : projection.powerRating >= 40
                  ? "text-amber-400"
                  : "text-red-400"
            }`}
          >
            {projection.powerRating.toFixed(0)}
          </div>
          <div className="text-[10px] text-zinc-600 uppercase tracking-wider">
            Power
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <span className="text-zinc-500">
          Rank #{projection.rank}
        </span>
        <span className="text-zinc-700">|</span>
        <span className="text-zinc-500">
          StdDev: {projection.stdDev.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
