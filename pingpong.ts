import { CosmWasmClient, SigningCosmWasmClient } from "npm:@cosmjs/cosmwasm-stargate";
import { Coin, DirectSecp256k1HdWallet } from "npm:@cosmjs/proto-signing";
import { assert, sleep } from "npm:@cosmjs/utils";
import { Decimal } from "npm:@cosmjs/math";
import { Tendermint34Client } from "npm:@cosmjs/tendermint-rpc";
import { GasPrice } from "npm:@cosmjs/stargate";

import { Config } from "./config.ts";
import {
  GetJobDeliveryResponse,
  GetJobRequestResponse,
  JobLifecycleDelivery,
  txQueryRound,
} from "./monitoring.ts";
import { timeOfRound, validRoundAfter } from "./drand.ts";
import { lastNBlocks, transactionHash } from "./blocks.ts";
import { Timer } from "./timer.ts";
import { dot, nl, writeStdout } from "./console.ts";

function timestampToDate(ts: string): Date {
  const millis = Decimal.fromAtomics(ts, 6).toFloatApproximation();
  return new Date(millis);
}

const pollTimeVerification = 350;
const pollTimeDelivery = 1200;

interface PinpongResult {
  /** e2e run time */
  readonly time: number;
  /** Time we waited for the beacon (included in `time`) */
  readonly waitForBeaconTime: number;
  readonly jobId: string;
  readonly drandRound: number;
}

export async function pingpoing(config: Config): Promise<PinpongResult> {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(config.mnemonic, {
    prefix: config.addressPrefix,
  });
  const address = (await wallet.getAccounts())[0].address;
  console.log("Wallet");
  console.log(`    Address: ${address}`);

  const client = await SigningCosmWasmClient.connectWithSigner(
    config.endpoint,
    wallet,
    { gasPrice: GasPrice.fromString(config.gasPrice) },
  );
  const chainId = await client.getChainId();
  console.log(`Chain info (${chainId})`);
  const balance = await client.getBalance(address, config.feeDenom);
  console.log(`    Balance: ${JSON.stringify(balance)}`);

  const { prices } = await client.queryContractSmart(config.proxyContract, { "prices": {} });
  console.log(`    Prices: ${JSON.stringify(prices)}`);
  assert(Array.isArray(prices) && prices.length === 1, "One element array expected");
  const price: Coin = prices[0];

  const noisClient = await CosmWasmClient.connect(config.noisEndpoint);
  console.log(`Chain info (${await noisClient.getChainId()})`);
  console.log(`    Drand contract address: ${config.drandContract}`);
  const drandConfig = await noisClient.queryContractSmart(config.drandContract, { config: {} });
  console.log(`    Drand contract config: ${JSON.stringify(drandConfig)}`);

  console.log(`Request Beacon (${chainId})`);
  const jobId = `Ping ${Math.random()}`;
  const timer = Timer.start();

  const gas = 1.1; // calculateFee(260_000, gasPrice);
  const ok = await client.execute(
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
    `    Inclusion: %c${timer.time()}`,
    "color: green",
  );

  let requestHeight = Number.NaN;
  let round = Number.NaN;
  let waitForBeaconTime = Number.NaN;
  const lifecycle1: GetJobRequestResponse = await client.queryContractSmart(
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
    txQueryRound(config.drandContract, round),
    undefined,
  );
  console.log(`    Submission transactions:`);
  for (const tx of verificationTxs) {
    // tx index missing (see https://github.com/cosmos/cosmjs/issues/1361)
    console.log(
      `    - Height: ${tx.height}; Tx index: ${null}; Tx: ${tx.hash}`,
    );
  }

  console.log(`Deliver Beacon (${chainId})`);
  let lifecycle2: JobLifecycleDelivery;
  writeStdout("    Waiting for beacon delivery ");
  while (true) {
    try {
      const delivery: GetJobDeliveryResponse = await client.queryContractSmart(
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

  const tmClient = await Tendermint34Client.connect(config.endpoint);

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
    time: timer.final(),
    waitForBeaconTime,
    jobId,
    drandRound: round,
  };
}
