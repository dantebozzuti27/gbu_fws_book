import type { RosterEntry, LineupEfficiency } from "../types";

/**
 * Analyze lineup optimization for a team's roster.
 *
 * Detects:
 * - IL/injured players occupying active lineup slots
 * - Bench players who project higher than starters at the same position
 *
 * Returns an efficiency score (0-1) where 1.0 = perfectly optimized.
 */
export function analyzeLineup(
  roster: RosterEntry[],
  teamId: number
): LineupEfficiency {
  const starters = roster.filter((r) => r.isStarter);
  const bench = roster.filter(
    (r) => r.lineupSlot === "BE" && r.injuryStatus !== "OUT"
  );

  let ilPlayersInLineup = 0;
  for (const starter of starters) {
    if (
      starter.lineupSlot !== "IL" &&
      (starter.injuryStatus === "OUT" ||
        starter.injuryStatus === "TEN_DAY_DL" ||
        starter.injuryStatus === "SIXTY_DAY_DL" ||
        starter.injuryStatus === "SUSPENSION")
    ) {
      ilPlayersInLineup++;
    }
  }

  let benchPlayersAboveStarters = 0;
  for (const benchPlayer of bench) {
    const benchProj =
      benchPlayer.espnProjection.perWeek *
      (benchPlayer.projection.injuryMultiplier ?? 1);
    if (benchProj <= 0) continue;

    const couldReplace = starters.some((starter) => {
      const starterProj =
        starter.espnProjection.perWeek *
        (starter.projection.injuryMultiplier ?? 1);

      const samePosition = benchPlayer.eligiblePositions.some((pos) =>
        starter.eligiblePositions.includes(pos)
      );

      return samePosition && benchProj > starterProj * 1.1;
    });

    if (couldReplace) benchPlayersAboveStarters++;
  }

  const totalSlots = starters.length || 1;
  const inefficiencies = ilPlayersInLineup + benchPlayersAboveStarters * 0.5;
  const efficiency = Math.max(0, Math.min(1, 1 - inefficiencies / totalSlots));

  return {
    teamId,
    efficiency,
    ilPlayersInLineup,
    benchPlayersAboveStarters,
  };
}
