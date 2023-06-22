import { parse } from "https://deno.land/std@0.171.0/flags/mod.ts";
import * as promclient from "npm:prom-client";
import express from "npm:express@4.18.2";
import { sleep } from "npm:@cosmjs/utils";

import { timedPingpong } from "./pingpong.ts";
import { getChainInfo } from "./chain_info.ts";
import { debugLog } from "./console.ts";
import { defaultBuckets } from "./buckets.ts";

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
    buckets: defaultBuckets,
  });

  const requestBeaconTxInclusionHistogram = new promclient.Histogram({
    name: "request_beacon_tx_inclusion",
    help: "The time it takes the beacon request tx to be included in a block of the dapp chain",
    labelNames: ["chainId"] as const,
    buckets: defaultBuckets,
  });

  const gatewayTxInclusionHistogram = new promclient.Histogram({
    name: "gateway_tx_inclusion",
    help: "The time it takes for the request beacon packet to be included on Nois",
    labelNames: ["chainId"] as const,
    buckets: defaultBuckets,
  });

  const processingHistogram = new promclient.Histogram({
    name: "processing",
    help: "The time of an e2e test we did not spend on waiting for drand",
    labelNames: ["chainId"] as const,
    buckets: defaultBuckets,
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
        e2eHistogram.observe({ chainId: chainInfo.chainId }, infTime);
        requestBeaconTxInclusionHistogram.observe({ chainId: chainInfo.chainId }, infTime);
        gatewayTxInclusionHistogram.observe({ chainId: chainInfo.chainId }, infTime);
        processingHistogram.observe({ chainId: chainInfo.chainId }, infTime);
      } else {
        const { time, inclusionTime, gatewayTxInclusionTime, waitForBeaconTime, drandRound: _ } = result;
        const processingTime = time - waitForBeaconTime;
        e2eHistogram.observe({ chainId: chainInfo.chainId }, time);
        requestBeaconTxInclusionHistogram.observe(
          { chainId: chainInfo.chainId },
          inclusionTime,
        );
        gatewayTxInclusionHistogram.observe({ chainId: chainInfo.chainId }, gatewayTxInclusionTime);
        processingHistogram.observe({ chainId: chainInfo.chainId }, processingTime);
        debugLog(
          `Success 🏓 E2E: ${time.toFixed(1)}s, Inclusion: ${
            inclusionTime.toFixed(1)
          }s, Processing: ${processingTime.toFixed(1)}s`,
        );
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
