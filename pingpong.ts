import { CosmWasmClient, SigningCosmWasmClient } from "npm:@cosmjs/cosmwasm-stargate";
import { Coin, DirectSecp256k1HdWallet } from "npm:@cosmjs/proto-signing";
import { assert, sleep } from "npm:@cosmjs/utils";
import { Decimal } from "npm:@cosmjs/math";
import { GasPrice } from "npm:@cosmjs/stargate";

import { Config, Secrets } from "./config.ts";
import { Tendermint34Client, Tendermint37Client, TendermintClient } from "./deps.ts";
import {
  GetJobDeliveryResponse,
  GetJobRequestResponse,
  JobLifecycleDelivery,
} from "./monitoring.ts";
import { timeOfRound, validRoundAfter } from "./drand.ts";
import { lastNBlocks, transactionHash } from "./blocks.ts";
import { Timer } from "./timer.ts";
import { dot, nl, writeStdout } from "./console.ts";
import { findRequest } from "./gateway.ts";

function timestampToDate(ts: string): Date {
  const millis = Decimal.fromAtomics(ts, 6).toFloatApproximation();
  return new Date(millis);
}

const pollTimeVerification = 350;
const pollTimeDelivery = 1200;

export interface PinpongResult {
  /** e2e run time in seconds */
  readonly time: number;
  /** Request beacon tx inclusion in seconds */
  readonly inclusionTime: number;
  /** Time between tx inclusion on the customer chain and the tx inclusion in the gateway */
  readonly requestBeaconRelayingTime: number;
  /** If the job got queued. If false, it existed already. */
  readonly queued: undefined | boolean;
  /** Time we waited for the beacon (included in `time`) in seconds */
  readonly waitForBeaconTime: number;
  readonly jobId: string;
  readonly drandRound: number;
}

function printableCoin(coin: Coin): string {
  if (coin.denom?.startsWith("u")) {
    const ticker = coin.denom.slice(1).toUpperCase();
    return Decimal.fromAtomics(coin.amount ?? "0", 6).toString() + " " + ticker;
  } else {
    return coin.amount + coin.denom;
  }
}

async function connectTendermint(endpoint: string): Promise<TendermintClient> {
  // Tendermint/CometBFT 0.34/0.37 auto-detection. Starting with 0.37 we seem to get reliable versions again 🎉
  // Using 0.34 as the fallback.
  let tmClient: TendermintClient;
  const tm37Client = await Tendermint37Client.connect(endpoint);
  const version = (await tm37Client.status()).nodeInfo.version;
  if (version.startsWith("0.37.")) {
    tmClient = tm37Client;
  } else {
    tm37Client.disconnect();
    tmClient = await Tendermint34Client.connect(endpoint);
  }
  return tmClient;
}

/**
 * A wrapper around the pingpong function that adds a global timeout of the whole
 * process.
 *
 * This function can lead to 3 results:
 * - PinpongResult (i.e. success)
 * - timeout
 * - exception
 */
export async function timedPingpong(
  config: Config,
  secrets: Secrets,
): Promise<"timed_out" | PinpongResult> {
  const controller = new AbortController();
  let timeoutId: number | undefined;

  const timeoutPromise: Promise<"timed_out"> = new Promise((resolve, _reject) => {
    timeoutId = setTimeout(() => resolve("timed_out"), config.timeout_time_seconds * 1000);
  });

  const result = await Promise.race([
    pingpong(config, secrets, controller),
    timeoutPromise,
  ]);

  assert(result !== "aborted", "pingpong must only abort after timeout resolved");

  if (result === "timed_out") {
    controller.abort();
  }

  clearTimeout(timeoutId);

  return result;
}

export async function pingpong(
  config: Config,
  secrets: Secrets,
  abortController: AbortController,
): Promise<"aborted" | PinpongResult> {
  const isAborted = { aborted: false };
  const abortListener = ({ target: _ }: Event) => {
    abortController.signal.removeEventListener("abort", abortListener);
    isAborted.aborted = true;
    console.warn("Pingpong aborted");
  };
  abortController.signal.addEventListener("abort", abortListener);

  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(secrets.mnemonic, {
    prefix: config.addressPrefix,
  });
  const address = (await wallet.getAccounts())[0].address;
  console.log("Wallet");
  console.log(`    Address: ${address}`);

  const consumerChainClient = await SigningCosmWasmClient.connectWithSigner(
    config.endpoint,
    wallet,
    {
      gasPrice: GasPrice.fromString(config.gasPrice),
      broadcastPollIntervalMs: 1_234, // check block inclusion more often than the default 3s to get more precise results
    },
  );
  const chainId = await consumerChainClient.getChainId();
  console.log(`Chain info (${chainId})`);
  const balance = await consumerChainClient.getBalance(address, config.feeDenom);
  console.log(`    Balance: ${JSON.stringify(balance)}`);

  const { config: proxyConfig } = await consumerChainClient.queryContractSmart(
    config.proxyContract,
    {
      "config": {},
    },
  );
  console.log(`    Proxy config: ${JSON.stringify(proxyConfig)}`);
  const paymentAddress = proxyConfig.payment; // address on Nois
  assert(typeof paymentAddress === "string", "Missing payment address");

  const { prices } = await consumerChainClient.queryContractSmart(config.proxyContract, {
    "prices": {},
  });
  console.log(`    Prices: ${JSON.stringify(prices)}`);
  assert(Array.isArray(prices) && prices.length >= 1, "Array with at last one option expected");

  const price: Coin | undefined = config.priceDenom
    ? prices.find((item) => item.denom === config.priceDenom)
    : prices[0];
  assert(price, "No suitable price option found");

  const noisClient = await CosmWasmClient.connect(config.noisEndpoint);
  console.log(`Chain info (${await noisClient.getChainId()})`);
  console.log(`    Drand contract address: ${config.drandContract}`);
  const drandConfig = await noisClient.queryContractSmart(config.drandContract, { config: {} });
  console.log(`    Drand contract config: ${JSON.stringify(drandConfig)}`);
  const paymentBalance = await noisClient.getBalance(paymentAddress, "unois");
  console.log(`    Payment address: ${paymentAddress}`);
  console.log(`    Payment balance: ${printableCoin(paymentBalance)}`);

  // Start timer after all the debug work is done
  const timer = Timer.start();
  console.log(`Request Beacon (${chainId})`);
  const jobId = `Ping ${Math.random()}`;

  const gas = 1.1; // calculateFee(260_000, gasPrice);
  const ok = await consumerChainClient.execute(
    address,
    config.monitoringContract,
    { "roll_dice": { "job_id": jobId } },
    gas,
    undefined,
    [price],
  );
  console.log(
    `    Height: ${ok.height}; Gas: ${ok.gasUsed}/${ok.gasWanted}; Tx: ${ok.transactionHash}`,
  );
  console.log(
    `    Request beacon tx inclusion: %c${timer.time()}`,
    "color: green",
  );
  const requestBeaconTxInclusionTime = timer.lastTime();

  let requestBeaconRelayingTime = Number.POSITIVE_INFINITY;
  let queued: undefined | boolean;
  const gatewayTimer = Timer.start();
  findRequest(config, noisClient, jobId).then((res) => {
    console.log(
      `RequestBeacon relaying time: %c${gatewayTimer.time()}`,
      "color: orange",
    );
    requestBeaconRelayingTime = timer.lastTime();
    queued = res.queued;
  }, (err) => console.error(err));

  let requestHeight = Number.NaN;
  let round = Number.NaN;
  let waitForBeaconTime = Number.NaN;
  const lifecycle1: GetJobRequestResponse = await consumerChainClient.queryContractSmart(
    config.monitoringContract,
    {
      "get_request": { "job_id": jobId },
    },
  );
  if (!lifecycle1) console.warn("Missing get_job_lifecycle response");
  else {
    const { height, tx_index, safety_margin, after } = lifecycle1;
    requestHeight = height;
    console.log(
      `    Height: ${height}; Tx index: ${tx_index}`,
    );
    console.log(
      `    Safety margin: ${(safety_margin / 1_000000000).toFixed(1)}s`,
    );
    const a = timestampToDate(after);
    round = validRoundAfter(a); // wie should get this from the ack instead of calculating it here
    const publishTime = timeOfRound(round);
    console.log(
      `    After: ${a.toISOString()}`,
    );
    console.log(`Drand publication (Round ${round})`);
    console.log(
      `    Publish time: ${publishTime.toISOString()}; Round: ${round}`,
    );

    waitForBeaconTime = (publishTime.getTime() - Date.now()) / 1000;
    console.log(
      `    Sleeping until publish time is reached (${waitForBeaconTime.toFixed(1)}s) ...`,
    );
    await sleep(waitForBeaconTime * 1000);
    console.log(
      `    Published: %c${timer.timeAt(publishTime)}`,
      "color: green",
    );
  }

  console.log(`Beacon verification (Round ${round})`);

  writeStdout("    Waiting for verification ");
  while (true) {
    const { beacon } = await noisClient.queryContractSmart(config.drandContract, {
      "beacon": { round: round },
    });
    if (beacon) break;
    else dot();
    await sleep(pollTimeVerification);
  }
  nl();
  console.log(
    `    Verification: %c${timer.time()}`,
    "color: green",
  );
  const verificationTxs = await noisClient.searchTx(
    [
      {
        key: "wasm._contract_address",
        value: config.drandContract,
      },
      {
        key: "wasm.round",
        value: round.toString(),
      },
    ],
  );
  console.log(`    Submission transactions:`);
  for (const tx of verificationTxs) {
    console.log(
      `    - Height: ${tx.height}; Tx index: ${tx.txIndex}; Tx: ${tx.hash}`,
    );
  }

  console.log(`Deliver Beacon (${chainId})`);
  let lifecycle2: JobLifecycleDelivery;
  writeStdout("    Waiting for beacon delivery ");
  while (true) {
    if (isAborted.aborted) return "aborted";
    try {
      const delivery: GetJobDeliveryResponse = await consumerChainClient.queryContractSmart(
        config.monitoringContract,
        {
          "get_delivery": { "job_id": jobId },
        },
      );
      if (delivery) {
        lifecycle2 = delivery;
        break;
      } else {
        dot();
      }
    } catch (err) {
      console.warn(err);
    }
    await sleep(pollTimeDelivery);
  }
  nl();
  console.log(
    `    Delivery: %c${timer.time()}`,
    "color: green",
  );
  const e2eTime = timer.lastTime();

  if (isAborted.aborted) return "aborted";

  const tmClient = await connectTendermint(config.endpoint);

  const { height, tx_index } = lifecycle2;
  const hash = typeof tx_index == "number"
    ? await transactionHash(tmClient, height, tx_index)
    : null;
  console.log(
    `    Height: ${height}; Tx index: ${tx_index}; Tx: ${hash}`,
  );
  const heightDiff = height - requestHeight;
  console.log(
    `    Height diff: ${heightDiff}`,
  );

  console.log(`Network congestion (${chainId})`);
  const n = Math.min(4, heightDiff);
  for (const [h, info] of await lastNBlocks(tmClient, height, n)) {
    console.log(
      `    Block ${h}: ${info}`,
    );
  }

  return {
    time: e2eTime,
    inclusionTime: requestBeaconTxInclusionTime,
    requestBeaconRelayingTime,
    queued,
    waitForBeaconTime,
    jobId,
    drandRound: round,
  };
}
