"use client";

import { formatOdds } from "@/lib/odds/utils";

interface OddsDisplayProps {
  odds: number;
  size?: "sm" | "md" | "lg";
  showSign?: boolean;
}

export function OddsDisplay({
  odds,
  size = "md",
  showSign = true,
}: OddsDisplayProps) {
  const formatted = showSign ? formatOdds(odds) : `${Math.abs(odds)}`;
  const isFavorite = odds < 0;

  const sizeClasses = {
    sm: "text-sm px-2 py-0.5",
    md: "text-base px-3 py-1",
    lg: "text-lg px-4 py-1.5 font-semibold",
  };

  return (
    <span
      className={`inline-block rounded font-mono ${sizeClasses[size]} ${
        isFavorite
          ? "bg-emerald-900/40 text-emerald-400"
          : "bg-red-900/30 text-red-400"
      }`}
    >
      {formatted}
    </span>
  );
}

interface ProbabilityBarProps {
  probability: number;
  label?: string;
  className?: string;
}

export function ProbabilityBar({
  probability,
  label,
  className = "",
}: ProbabilityBarProps) {
  const pct = Math.round(probability * 100);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background:
              pct > 66
                ? "linear-gradient(90deg, #059669, #10b981)"
                : pct > 33
                  ? "linear-gradient(90deg, #d97706, #f59e0b)"
                  : "linear-gradient(90deg, #dc2626, #ef4444)",
          }}
        />
      </div>
    </div>
  );
}
