import { SigningCosmWasmClient } from "npm:@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1HdWallet } from "npm:@cosmjs/proto-signing";
import { calculateFee, GasPrice } from "npm:@cosmjs/stargate";
import { toAscii } from "npm:@cosmjs/encoding";
import { sleep } from "npm:@cosmjs/utils";
import { ReadonlyDate } from "npm:readonly-date";

const endpoint = "https://juno-testnet-rpc.polkachu.com/";
const proxy = "juno1v82su97skv6ucfqvuvswe0t5fph7pfsrtraxf0x33d8ylj5qnrysdvkc95";
const dice = "juno1t4flkyd7e0nck83cdeqel6pjfg3pwgs5qzlq584av37gs7q88gmqw6pa5s";
const mnemonic = "exile another monster skin patient drink despair mule baby meadow pencil casino";
const feeDenom = "ujunox";
const gasPrice = GasPrice.fromString(`0.025${feeDenom}`);

// in seconds
function diff(a: ReadonlyDate, b: ReadonlyDate): number {
  return (b.getTime() - a.getTime()) / 1000;
}

if (import.meta.main) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: "juno",
  });
  const address = (await wallet.getAccounts())[0].address;
  console.log("Wallet address:", address);

  const client = await SigningCosmWasmClient.connectWithSigner(
    endpoint,
    wallet,
    { gasPrice },
  );
  console.log("Balance:", await client.getBalance(address, feeDenom));

  const { prices } = await client.queryContractSmart(proxy, { "prices": {} });
  console.log("Prices", prices);

  const jobId = `Ping ${Math.random()}`;

  const start = new Date(Date.now());
  console.log("Start", start.toISOString());

  const funds = { amount: "100", denom: "ujunox" };
  const gas = "auto"; // calculateFee(260_000, gasPrice);
  const ok = await client.execute(
    address,
    dice,
    {
      "roll_dice": { "job_id": jobId },
    },
    gas,
    undefined,
    [funds],
  );
  console.log(
    `Height: ${ok.height}; Gas: ${ok.gasUsed}/${ok.gasWanted}; Tx: ${ok.transactionHash}`,
  );
  const inclusion = new Date(Date.now());
  console.log(
    `Inclusion: ${inclusion.toISOString()} (${diff(start, inclusion).toFixed(1)}s)`,
  );

  let first = true;
  while (true) {
    try {
      const response = await client.queryContractSmart(dice, {
        "query_outcome": { "job_id": jobId },
      });
      if (response) {
        break;
      } else {
        if (first) {
          Deno.stdout.writeSync(toAscii("Waiting for beacon delivery "));
          first = false;
        }
        Deno.stdout.writeSync(new Uint8Array([0x2e]));
      }
    } catch (err) {
      console.warn(err);
    }
    await sleep(2000);
  }
  Deno.stdout.writeSync(new Uint8Array([0x0a]));
  const resultFound = new Date(Date.now());
  console.log(
    `Result found: ${resultFound.toISOString()} (${diff(start, resultFound).toFixed(1)}s)`,
  );
}
