/**
 * When Vercel invokes this route on a schedule, we only run the heavy fetch
 * if the trigger falls in an allowed window. Vercel crons are UTC-only; we
 * interpret "Sundays 11 AM–11 PM" in America/New_York (handles DST).
 *
 * Manual triggers (same Bearer secret, non-cron User-Agent) always run.
 */

const EASTERN = "America/New_York";

const DAILY_FETCH_UTC_HOUR = 13;
const SUNDAY_WINDOW_START_MIN = 11 * 60;
const SUNDAY_WINDOW_END_MIN = 23 * 60 + 30;

function easternTimeParts(date: Date): {
  weekdayShort: string;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const weekdayShort = get("weekday");
  const hourStr = get("hour");
  const minuteStr = get("minute");
  const hour = Number.parseInt(hourStr, 10);
  const minute = Number.parseInt(minuteStr, 10);

  return {
    weekdayShort,
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

export function isVercelCronInvocation(request: Request): boolean {
  if (request.headers.get("x-vercel-cron") === "1") return true;
  const ua = request.headers.get("user-agent") ?? "";
  return ua.includes("vercel-cron");
}

/**
 * Returns true if this scheduled hit should execute the league fetch.
 * - Daily: 13:00 UTC (8 AM EST / 9 AM EDT) every day
 * - Sundays only (Eastern calendar): 11:00–23:30 inclusive, every ~30 min
 *   (actual cadence is whatever UTC crons fire; we gate on Eastern time)
 */
export function shouldRunScheduledLeagueFetch(now: Date): boolean {
  const utcM = now.getUTCMinutes();
  const utcH = now.getUTCHours();

  if (utcM === 0 && utcH === DAILY_FETCH_UTC_HOUR) {
    return true;
  }

  const { weekdayShort, hour, minute } = easternTimeParts(now);
  if (weekdayShort !== "Sun") {
    return false;
  }

  const mins = hour * 60 + minute;
  return mins >= SUNDAY_WINDOW_START_MIN && mins <= SUNDAY_WINDOW_END_MIN;
}
