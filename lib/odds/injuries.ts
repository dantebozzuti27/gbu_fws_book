import type { RosterEntry } from "../types";

const INJURY_MULTIPLIERS: Record<string, number> = {
  ACTIVE: 1.0,
  NORMAL: 1.0,
  DAY_TO_DAY: 0.75,
  SEVEN_DAY_DL: 0.0,
  TEN_DAY_DL: 0.0,
  FIFTEEN_DAY_DL: 0.0,
  SIXTY_DAY_DL: 0.0,
  OUT: 0.0,
  SUSPENSION: 0.0,
};

/**
 * Compute injury multiplier for a player's projection.
 *
 * - Active/healthy: 1.0 (full value)
 * - Day-to-day: 0.75 (likely to miss some games)
 * - Any IL/DL/Out/Suspended: 0.0 (zero contribution)
 * - Players slotted in IL lineup slot: 0.0 regardless of status
 */
export function getInjuryMultiplier(entry: RosterEntry): number {
  if (entry.lineupSlot === "IL") return 0;

  const status = entry.injuryStatus ?? "ACTIVE";
  return INJURY_MULTIPLIERS[status] ?? 0.8;
}

/**
 * Apply injury adjustments across a full roster.
 * Mutates the projection.injuryMultiplier field on each entry.
 */
export function applyInjuryAdjustments(
  roster: RosterEntry[]
): RosterEntry[] {
  return roster.map((entry) => ({
    ...entry,
    projection: {
      ...entry.projection,
      injuryMultiplier: getInjuryMultiplier(entry),
    },
  }));
}
