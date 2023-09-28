const DRAND_GENESIS = new Date(1677685200_000);
const DRAND_ROUND_LENGTH = 3_000; // in milliseconds

// See TimeOfRound implementation: https://github.com/drand/drand/blob/eb36ba81e3f28c966f95bcd602f60e7ff8ef4c35/chain/time.go#L30-L33
export function timeOfRound(round: number): Date {
  return new Date(DRAND_GENESIS.getTime() + (round - 1) * DRAND_ROUND_LENGTH);
}

function roundAfter(base: Date): number {
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

/**
 * Calculates the round which the gateway contract will commit to for the
 * given `after` value. In an ideal world we'd not need this function here
 * but could just read it from the content of the IBC acknowledegement but
 * for now this is easier.
 */
export function validRoundAfter(after: Date): number {
  return roundAfter(after);
}
