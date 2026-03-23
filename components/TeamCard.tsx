"use client";

import type { TeamProjection } from "@/lib/types";

interface TeamCardProps {
  projection: TeamProjection;
}

export function TeamCard({ projection }: TeamCardProps) {
  const pwrColor =
    projection.powerRating >= 70
      ? "text-emerald-400"
      : projection.powerRating >= 40
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className="flex items-center justify-between py-2.5 min-h-[44px]">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs text-zinc-600 font-mono w-5 text-right shrink-0">
          #{projection.rank}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-zinc-100 truncate">
            {projection.teamName}
          </p>
          <p className="text-[11px] text-zinc-500">
            {projection.projectedWeeklyTotal.toFixed(0)} pts/wk
          </p>
        </div>
      </div>
      <div className={`text-lg font-bold font-mono ${pwrColor} shrink-0`}>
        {projection.powerRating.toFixed(0)}
      </div>
    </div>
  );
}
