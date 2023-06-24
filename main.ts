import { parse } from "https://deno.land/std@0.171.0/flags/mod.ts";
import express from "npm:express@4.18.2";
import { sleep } from "npm:@cosmjs/utils";

import { timedPingpong } from "./pingpong.ts";
import { getChainInfo } from "./chain_info.ts";
import { debugLog } from "./console.ts";
import { makePingpongCounters } from "./counters.ts";
import { promclient } from "./deps.ts";
import { defaultBuckets, smallBuckets } from "./buckets.ts";

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

  const metricsApp = express();

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
    buckets: smallBuckets,
  });

  const requestBeaconRelayingHistogram = new promclient.Histogram({
    name: "request_beacon_relaying",
    help: "The time it takes for the request beacon packet to be included on Nois",
    labelNames: ["chainId"] as const,
    buckets: smallBuckets,
  });

  const processingHistogram = new promclient.Histogram({
    name: "processing",
    help: "The time of an e2e test we did not spend on waiting for drand",
    labelNames: ["chainId"] as const,
    buckets: defaultBuckets,
  });

  const pingpongCounters = makePingpongCounters();

  // deno-lint-ignore no-explicit-any
  metricsApp.get("/metrics", (_req: any, res: any) => {
    res.set("Content-Type", promclient.register.contentType);
    promclient.register.metrics().then((metrics) => res.end(metrics));
  });

  const metricsServer = metricsApp.listen(port, function () {
    debugLog(`Metrics server listening on port ${port} ...`);
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
        requestBeaconRelayingHistogram.observe({ chainId: chainInfo.chainId }, infTime);
        processingHistogram.observe({ chainId: chainInfo.chainId }, infTime);
        pingpongCounters.timeout.inc({ chainId: chainInfo.chainId });
      } else {
        const {
          time,
          inclusionTime,
          requestBeaconRelayingTime,
          queued: _queued,
          waitForBeaconTime,
          drandRound: _,
        } = result;
        const processingTime = time - waitForBeaconTime;
        e2eHistogram.observe({ chainId: chainInfo.chainId }, time);
        requestBeaconTxInclusionHistogram.observe(
          { chainId: chainInfo.chainId },
          inclusionTime,
        );
        requestBeaconRelayingHistogram.observe(
          { chainId: chainInfo.chainId },
          requestBeaconRelayingTime,
        );
        processingHistogram.observe({ chainId: chainInfo.chainId }, processingTime);
        pingpongCounters.success.inc({ chainId: chainInfo.chainId });
        debugLog(
          `Success 🏓 E2E: ${time.toFixed(1)}s, Inclusion: ${
            inclusionTime.toFixed(1)
          }s, RequestBeacon relaying: ${requestBeaconRelayingTime.toFixed(1)}s, Processing: ${
            processingTime.toFixed(1)
          }s`,
        );
      }
    } catch (err) {
      // Some error, probably RPC things.
      // Neither e2eHistogram nor processingHistogram observe here.
      pingpongCounters.error.inc({ chainId: chainInfo.chainId });
      console.error(err);
    }

    if (flags.mode == "loop") {
      const randomSeconds = Math.random() * 30; // 0-30 seconds
      console.log(
        `Sleeping for %c${config.sleep_time_minutes}min plus ${randomSeconds.toFixed(1)}sec%c ...`,
        "color: yellow",
        "",
      );
      const sleepSeconds = config.sleep_time_minutes * 60 + randomSeconds;
      await sleep(sleepSeconds * 1000);
    }
  }

  debugLog("Closing metrics server...");
  metricsServer.close();
}
