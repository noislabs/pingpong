import { parse } from "https://deno.land/std@0.171.0/flags/mod.ts";
import * as promclient from "npm:prom-client";
import express from "npm:express@4.18.2";
import { testnet } from "./env.ts";

import { pingpoing } from "./pingpong.ts";
import { debugLog } from "./console.ts";

const flags = parse(Deno.args, {
  string: ["mode"],
  default: {
    mode: "single",
  },
});

const port = 3001;

if (import.meta.main) {
  const app = express();

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


  const histogram = new promclient.Histogram({
    name: "e2e",
    help: "End2end testing",
    labelNames: ["chain_id"] as const,
    buckets: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 220, 240, 260, 280, 300],
  });

  const histogramProcessing = new promclient.Histogram({
    name: "processing",
    help: "The time of an e2e test we did not spend on waiting for drand",
    labelNames: ["chain_id"] as const,
    buckets: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 220, 240, 260, 280, 300],
  });

  // deno-lint-ignore no-explicit-any
  app.get("/metrics", (_req: any, res: any) => {
    res.set("Content-Type", promclient.register.contentType);
    promclient.register.metrics().then((metrics) => res.end(metrics));
  });

  const server = app.listen(port, function () {
    debugLog(`Listening on port ${port} ...`);
  });

  for (let i = 0; i < limit; i++) {
    const t = histogram.startTimer({ chain_id: testnet.chainId });
    const { time, waitForBeaconTime, drandRound: _ } = await pingpoing();
    t();

    const processingTime = time - waitForBeaconTime;
    histogramProcessing.observe({ chain_id: testnet.chainId }, processingTime)
  }

  debugLog("Closing metrics server...")
  server.close();
}
