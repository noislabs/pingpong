import { parse } from "https://deno.land/std@0.171.0/flags/mod.ts";
import * as promclient from "npm:prom-client";
import express from "npm:express@4.18.2";
import { sleep } from "npm:@cosmjs/utils";

import { timedPingpong } from "./pingpong.ts";
import { getChainInfo } from "./chain_info.ts";
import { debugLog } from "./console.ts";

const flags = parse(Deno.args, {
  string: ["mode"],
  default: {
    mode: "single",
  },
});

const port = 3001;

const infTime = Number.MAX_SAFE_INTEGER;

if (import.meta.main) {
  const { default: config } = await import("./config.json", {
    assert: { type: "json" },
  });

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

  const e2eHistogram = new promclient.Histogram({
    name: "e2e",
    help: "End2end testing",
    labelNames: ["chainId"] as const,
    // deno-fmt-ignore
    buckets: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 220, 240, 260, 280, 300],
  });

  const processingHistogram = new promclient.Histogram({
    name: "processing",
    help: "The time of an e2e test we did not spend on waiting for drand",
    labelNames: ["chainId"] as const,
    // deno-fmt-ignore
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

  const chainInfo = await getChainInfo(config.endpoint);
  debugLog(`Chain info: ${JSON.stringify(chainInfo)}`);

  for (let i = 0; i < limit; i++) {
    try {
      const result = await timedPingpong(config);
      if (result === "timed_out") {
        debugLog(
          `Timeout after ${config.timeout_time_seconds} seconds. Setting prometheus elapsed time to 1 hour (+inf)`,
        );
        processingHistogram.observe({ chainId: chainInfo.chainId }, infTime);
        e2eHistogram.observe({ chainId: chainInfo.chainId }, infTime);
      } else {
        const { time, waitForBeaconTime, drandRound: _ } = result;
        const processingTime = time - waitForBeaconTime;
        processingHistogram.observe({ chainId: chainInfo.chainId }, processingTime);
        e2eHistogram.observe({ chainId: chainInfo.chainId }, time);
        debugLog(`Success 🏓 E2E: ${time.toFixed(1)}s, Processing: ${processingTime.toFixed(1)}s`);
      }
    } catch (err) {
      // Some error, probably RPC things.
      // Neither e2eHistogram nor processingHistogram observe here.
      console.error(err);
    }

    if (flags.mode == "loop") {
      console.log(
        `Sleeping for %c${config.sleep_time_minutes} minutes ...`,
        "color: yellow",
      );
      await sleep(config.sleep_time_minutes * 60 * 1000);
    }
  }

  debugLog("Closing metrics server...");
  server.close();
}
