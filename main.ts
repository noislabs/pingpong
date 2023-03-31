import { parse } from "https://deno.land/std@0.171.0/flags/mod.ts";
import * as client from "npm:prom-client";
import { testnet } from "./env.ts";

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

  const histogram = new client.Histogram({
    name: "e2e",
    help: "End2end testing",
    labelNames: ["chain_id"] as const,
    buckets: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180],
  });

  // const gaugeE2e = new client.Gauge({
  //   name: "e2e",
  //   help: "End2end testing",
  //   labelNames: ["network", "run", "round"] as const,
  // });

  const gaugeProcessing = new client.Gauge({
    name: "processing",
    help: "The time of an e2e test we did not spend on waiting for drand",
    labelNames: ["network", "run", "round"] as const,
  });

  for (let i = 0; i < limit; i++) {
    const t = histogram.startTimer({ chain_id: testnet.chainId });
    const { time, waitForBeaconTime, drandRound } = await pingpoing();
    t();

    // Set gauges
    // gaugeE2e.set({ network: chainId, run: i, round: drandRound }, time);
    // histogram.observe(time);
    const processingTime = time - waitForBeaconTime;
    gaugeProcessing.set({ network: testnet.chainId, run: i, round: drandRound }, processingTime);

    client.register.getMetricsAsJSON();
    const metrics = await client.register.metrics();
    console.log(metrics);
    console.log(await client.register.getMetricsAsJSON());
  }
}
