import { promclient } from "./deps.ts";

/** Global result counters. For each run, one of the counters is incremented. */
export function makePingpongCounters() {
  return {
    success: new promclient.Counter({
      name: "pingpong_success",
      help: "Number of successful pingpong runs.",
      labelNames: ["chainId"] as const,
    }),
    timeout: new promclient.Counter({
      name: "pingpong_timeout",
      help: "Number pingpong runs that times out.",
      labelNames: ["chainId"] as const,
    }),
    error: new promclient.Counter({
      name: "pingpong_error",
      help:
        "Number of failed pingpong runs. This is incremented in case of an exception. Timeouts are not in here.",
      labelNames: ["chainId"] as const,
    }),
  };
}

/** Job queued counters. For each successful run, one of the counters is incremented. */
export function makeQueuedCounters() {
  return {
    queued: new promclient.Counter({
      name: "jobs_queued",
      help: "Number of jobs queued in gateway. I.e. when the randomness is not yet available.",
      labelNames: ["chainId"] as const,
    }),
    notQueued: new promclient.Counter({
      name: "jobs_not_queued",
      help: "Number of jobs not queued in gateway. I.e. when the randomness is available.",
      labelNames: ["chainId"] as const,
    }),
  };
}
