import { parse } from "https://deno.land/std@0.171.0/flags/mod.ts";
import * as client from "npm:prom-client";
import { chainId } from "./env.ts";

import { pingpoing } from "./pingpong.ts";

const flags = parse(Deno.args, {
  string: ["mode"],
  default: {
    mode: "single",
  },
});

if (import.meta.main) {
  let limit: number;
  switch (flags.mode) {
    case "single":
      limit = 1;
      break;
    case "loop":
      limit = Number.MAX_SAFE_INTEGER;
      break;
    default:
      throw new Error("Argument mode must be 'single' or loop");
  }

  const gaugeE2e = new client.Gauge({
    name: "e2e",
    help: "End2end testing",
    labelNames: ["network", "run", "round"] as const,
  });

  const gaugeProcessing = new client.Gauge({
    name: "processing",
    help: "The time of an e2e test we did not spend on waiting for drand",
    labelNames: ["network", "run", "round"] as const,
  });

  for (let i = 0; i < limit; i++) {
    const { time, waitForBeaconTime, drandRound } = await pingpoing();

    // Set gauges
    gaugeE2e.set({ network: chainId, run: i, round: drandRound }, time);
    const processingTime = time - waitForBeaconTime;
    gaugeProcessing.set({ network: chainId, run: i, round: drandRound }, processingTime);

    const metrics = await client.register.metrics();
    console.log(metrics);
  }
}
