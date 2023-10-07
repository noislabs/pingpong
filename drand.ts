const DRAND_GENESIS_S = 1677685200;
const DRAND_GENESIS_NS = BigInt(DRAND_GENESIS_S) * BigInt(1_000_000_000);
const DRAND_GENESIS = new Date(DRAND_GENESIS_S * 1000);
const DRAND_ROUND_LENGTH_MS = 3_000; // in milliseconds
const DRAND_ROUND_LENGTH_NS = BigInt(3_000_000_000); // in nanoseconds

// See TimeOfRound implementation: https://github.com/drand/drand/blob/eb36ba81e3f28c966f95bcd602f60e7ff8ef4c35/chain/time.go#L30-L33
export function timeOfRound(round: number): Date {
  return new Date(DRAND_GENESIS.getTime() + (round - 1) * DRAND_ROUND_LENGTH_MS);
}

function roundAfterImpl(base: bigint): number {
  // Losely ported from https://github.com/drand/drand/blob/eb36ba81e3f28c966f95bcd602f60e7ff8ef4c35/chain/time.go#L49-L63
  if (base < DRAND_GENESIS_NS) {
    return 1;
  } else {
    const from_genesis = base - DRAND_GENESIS_NS;
    const periods_since_genesis = from_genesis / DRAND_ROUND_LENGTH_NS;
    const next_period_index = Number(periods_since_genesis + BigInt(1));
    return next_period_index + 1; // Convert 0-based counting to 1-based counting
  }
}

/**
 * Calculates the round which the gateway contract will commit to for the
 * given `after` value. In an ideal world we'd not need this function here
 * but could just read it from the content of the IBC acknowledegement but
 * for now this is easier.
 */
export function roundAfter(after: string | bigint): number {
  return roundAfterImpl(BigInt(after));
}
