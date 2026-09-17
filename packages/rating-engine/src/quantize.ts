/**
 * Half-away-from-zero to 4 decimal places.
 * Examples: 1.23455 → 1.2346, -1.23455 → -1.2346
 */
export function quantize4(x: number): number {
  if (!Number.isFinite(x)) {
    throw new Error(`quantize4: non-finite input ${x}`);
  }
  const sign = x < 0 ? -1 : 1;
  const scaled = Math.abs(x) * 10000;
  const whole = Math.floor(scaled);
  const frac = scaled - whole;
  const adj = frac >= 0.5 ? whole + 1 : whole;
  return (sign * adj) / 10000;
}

export function toFixed4String(x: number): string {
  return quantize4(x).toFixed(4);
}
