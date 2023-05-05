import { parse } from "https://deno.land/std@0.171.0/flags/mod.ts";
import * as promclient from "npm:prom-client";
import express from "npm:express@4.18.2";

import { pingpong } from "./pingpong.ts";
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

class TimeoutError extends Error {
  constructor() {
    super("Timeout reached");
  }
}

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

  const histogram = new promclient.Histogram({
    name: "e2e",
    help: "End2end testing",
    labelNames: ["chainId"] as const,
    // deno-fmt-ignore
    buckets: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 220, 240, 260, 280, 300],
  });

  const histogramProcessing = new promclient.Histogram({
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
    const t = histogram.startTimer({ chainId: chainInfo.chainId });
    try {
      const timeoutPromise: Promise<never> = new Promise((_, reject) =>
        setTimeout(() => reject(new TimeoutError()), config.timeout_time_seconds * 1000)
      );
      const result = await Promise.race([
        pingpong(config),
        timeoutPromise,
      ]);

      const { time, waitForBeaconTime, drandRound: _ } = result;
      t();
      const processingTime = time - waitForBeaconTime;
      histogramProcessing.observe({ chainId: chainInfo.chainId }, processingTime);
    } catch (_err) {
      console.log(
        "Timeout after",
        config.timeout_time_seconds,
        " seconds, Setting prometheus elapsed time to 1 hour (+inf)",
      );

      histogramProcessing.observe({ chainId: chainInfo.chainId }, infTime);
      histogram.observe({ chainId: chainInfo.chainId }, infTime);
    }

    if (flags.mode == "loop") {
      console.log("sleeping for ", config.sleep_time_minutes, " minutes");
      await new Promise((resolve) => setTimeout(resolve, config.sleep_time_minutes * 60 * 1000));
    }
  }

  debugLog("Closing metrics server...");
  server.close();
}
