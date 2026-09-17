/** IEEE-754 expected score for side A vs B (Elo logistic). */
export function expectedScore(ratingA: number, ratingB: number, scale: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / scale));
}

export function mean(xs: number[]): number {
  if (xs.length === 0) throw new Error("mean of empty array");
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
