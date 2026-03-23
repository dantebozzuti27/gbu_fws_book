/**
 * Standard normal CDF approximation (Abramowitz & Stegun 26.2.17).
 * Max error ~1.5e-7, which is more than sufficient for odds calculation.
 */
export function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Sample from a normal distribution using Box-Muller transform.
 */
export function sampleNormal(mean: number, stdDev: number): number {
  let u1 = Math.random();
  let u2 = Math.random();
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + stdDev * z;
}

/**
 * Convert a win probability (0-1) to American odds.
 *
 * Favorite (prob > 0.5): negative number, e.g. -150 means bet $150 to win $100
 * Underdog (prob < 0.5): positive number, e.g. +200 means bet $100 to win $200
 *
 * 10% vig (juice): at a pick'em (50/50), both sides show -110.
 * Bettor risks $110 to win $100 — the extra $10 protects the book.
 * VIG = 22/21 so that 0.5 * VIG = 11/21 → exactly -110.
 */
export function probabilityToAmericanOdds(prob: number): number {
  const VIG = 22 / 21;
  const vigProb = Math.min(0.99, Math.max(0.001, prob * VIG));

  if (vigProb >= 0.5) {
    return Math.round(-(vigProb / (1 - vigProb)) * 100);
  }
  return Math.round(((1 - vigProb) / vigProb) * 100);
}

/**
 * Round to nearest 0.5 (for spreads and totals).
 */
export function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/**
 * Format American odds for display: +130, -150, EVEN
 */
export function formatOdds(odds: number): string {
  if (odds === 100 || odds === -100) return "EVEN";
  return odds > 0 ? `+${odds}` : `${odds}`;
}
