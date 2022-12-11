const DRAND_GENESIS = new Date(1595431050_000);
const DRAND_ROUND_LENGTH = 30_000; // in milliseconds

// See TimeOfRound implementation: https://github.com/drand/drand/blob/eb36ba81e3f28c966f95bcd602f60e7ff8ef4c35/chain/time.go#L30-L33
export function timeOfRound(round: number): Date {
  return new Date(DRAND_GENESIS.getTime() + (round - 1) * DRAND_ROUND_LENGTH);
}

export function roundAfter(base: Date): number {
  // Losely ported from https://github.com/drand/drand/blob/eb36ba81e3f28c966f95bcd602f60e7ff8ef4c35/chain/time.go#L49-L63
  if (base < DRAND_GENESIS) {
    return 1;
  } else {
    const from_genesis = base.getTime() - DRAND_GENESIS.getTime();
    const periods_since_genesis = Math.floor(from_genesis / DRAND_ROUND_LENGTH);
    const next_period_index = periods_since_genesis + 1;
    return next_period_index + 1; // Convert 0-based counting to 1-based counting
  }
}
