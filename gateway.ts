import { CosmWasmClient } from "npm:@cosmjs/cosmwasm-stargate";
import { fromBase64, fromUtf8 } from "npm:@cosmjs/encoding";
import { assert, sleep } from "npm:@cosmjs/utils";

import { Config } from "./config.ts";

export interface FoundRequest {
  height: number;
  tx_index: number;
}

export async function findRequest(
  config: Config,
  noisClient: CosmWasmClient,
  jobId: string,
): Promise<FoundRequest> {
  for (let run = 1; run < 1000; run += 1) {
    // console.log("Sending requests_log_desc query ...");
    const { requests } = await noisClient.queryContractSmart(config.gatewayContract, {
      "requests_log_desc": {
        "channel_id": config.customer,
        "offset": 0,
        "limit": 5,
      },
    });
    // console.log("Gateway requests:", requests);
    // deno-lint-ignore no-explicit-any
    const myRequest = requests.find((request: any) => {
      const origin = JSON.parse(fromUtf8(fromBase64(request.origin), true));
      return origin.job_id === jobId;
    });

    if (myRequest) {
      assert(Array.isArray(myRequest.tx), "Found invaid tx field in request entry");
      return {
        height: myRequest.tx[0],
        tx_index: myRequest.tx[1],
      };
    }

    const sleepTime = run < 10 ? 300 : run <= 100 ? 800 : 2000
    await sleep(sleepTime);
  }
  throw new Error("Request not found. Giving up.");
}
