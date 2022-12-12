import { SigningCosmWasmClient } from "npm:@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1HdWallet } from "npm:@cosmjs/proto-signing";
import { GasPrice } from "npm:@cosmjs/stargate";
import { toAscii } from "npm:@cosmjs/encoding";
import { sleep } from "npm:@cosmjs/utils";
import { Decimal } from "npm:@cosmjs/math";
import { Tendermint34Client } from "npm:@cosmjs/tendermint-rpc";
import {
  GetJobDeliveryResponse,
  GetJobRequestResponse,
  JobLifecycleDelivery,
  monitoringContract,
} from "./monitoring.ts";
import { roundAfter, timeOfRound } from "./drand.ts";
import { lastNBlocks, transactionHash } from "./blocks.ts";
import { Timer } from "./timer.ts";

const endpoint = "https://juno-testnet-rpc.polkachu.com/";
const proxy = "juno1v82su97skv6ucfqvuvswe0t5fph7pfsrtraxf0x33d8ylj5qnrysdvkc95";
const mnemonic = "exile another monster skin patient drink despair mule baby meadow pencil casino";
const feeDenom = "ujunox";
const addressPrefix = "juno";
const gasPrice = GasPrice.fromString(`0.025${feeDenom}`);

function timestampToDate(ts: string): Date {
  const millis = Decimal.fromAtomics(ts, 6).toFloatApproximation();
  return new Date(millis);
}

if (import.meta.main) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: addressPrefix });
  const address = (await wallet.getAccounts())[0].address;
  console.log("Wallet");
  console.log(`    Address: ${address}`);

  const client = await SigningCosmWasmClient.connectWithSigner(
    endpoint,
    wallet,
    { gasPrice },
  );
  const chainId = await client.getChainId();
  console.log(`Chain info (${chainId})`);
  const balance = await client.getBalance(address, feeDenom);
  console.log(`    Balance: ${JSON.stringify(balance)}`);

  const { prices } = await client.queryContractSmart(proxy, { "prices": {} });
  console.log(`    Prices: ${JSON.stringify(prices)}`);

  console.log(`Request Beacon (${chainId})`);
  const jobId = `Ping ${Math.random()}`;
  const timer = Timer.start();

  const funds = { amount: "100", denom: "ujunox" };
  const gas = 1.1; // calculateFee(260_000, gasPrice);
  const ok = await client.execute(
    address,
    monitoringContract,
    { "roll_dice": { "job_id": jobId } },
    gas,
    undefined,
    [funds],
  );
  console.log(
    `    Height: ${ok.height}; Gas: ${ok.gasUsed}/${ok.gasWanted}; Tx: ${ok.transactionHash}`,
  );
  console.log(
    `    Inclusion: %c${timer.time()}`,
    "color: green",
  );

  let requestHeight = Number.NaN;
  const lifecycle1: GetJobRequestResponse = await client.queryContractSmart(monitoringContract, {
    "get_request": { "job_id": jobId },
  });
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
    const round = roundAfter(a);
    const publishTime = timeOfRound(round);
    console.log(
      `    After: ${a.toISOString()}`,
    );
    console.log(`Drand publication (#${round})`);
    console.log(
      `    Publish time: ${publishTime.toISOString()}; Round: ${round}`,
    );
    const waitForRound = publishTime.getTime() - Date.now();
    console.log(
      `    Sleeping until publish time is reached (${(waitForRound / 1000).toFixed(1)}s) ...`,
    );
    await sleep(waitForRound);
    console.log(
      `    Published: %c${timer.timeAt(publishTime)}`,
      "color: green",
    );
  }

  console.log(`Deliver Beacon (${chainId})`);
  let first = true;
  let lifecycle2: JobLifecycleDelivery;
  while (true) {
    try {
      const delivery: GetJobDeliveryResponse = await client.queryContractSmart(monitoringContract, {
        "get_delivery": { "job_id": jobId },
      });
      if (delivery) {
        lifecycle2 = delivery;
        break;
      } else {
        if (first) {
          Deno.stdout.writeSync(toAscii("    Waiting for beacon delivery "));
          first = false;
        }
        Deno.stdout.writeSync(new Uint8Array([0x2e]));
      }
    } catch (err) {
      console.warn(err);
    }
    await sleep(1500);
  }
  Deno.stdout.writeSync(new Uint8Array([0x0a]));
  console.log(
    `    Delivery: %c${timer.time()}`,
    "color: green",
  );

  const tmClient = await Tendermint34Client.connect(endpoint);

  const { height, tx_index } = lifecycle2;
  const hash = tx_index ? await transactionHash(tmClient, height, tx_index) : null;
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
}
