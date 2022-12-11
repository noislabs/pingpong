import { SigningCosmWasmClient } from "npm:@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1HdWallet } from "npm:@cosmjs/proto-signing";
import { GasPrice } from "npm:@cosmjs/stargate";

const endpoint = "https://juno-testnet-rpc.polkachu.com/";
const proxy = "juno1v82su97skv6ucfqvuvswe0t5fph7pfsrtraxf0x33d8ylj5qnrysdvkc95";
const mnemonic = "exile another monster skin patient drink despair mule baby meadow pencil casino";
const feeDenom = "ujunox";
const addressPrefix = "juno";
const gasPrice = GasPrice.fromString(`0.025${feeDenom}`);
const wasmPath = "../nois-dapp-examples/wasm/monitoring.wasm";

if (import.meta.main) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: addressPrefix });
  const address = (await wallet.getAccounts())[0].address;
  console.log("Wallet address:", address);

  const client = await SigningCosmWasmClient.connectWithSigner(
    endpoint,
    wallet,
    { gasPrice },
  );

  const wasm = Deno.readFileSync(wasmPath);
  const upload = await client.upload(address, wasm, "auto");
  console.log(upload);

  const res = await client.instantiate(
    address,
    upload.codeId,
    { nois_proxy: proxy },
    "A monitoring contract",
    "auto",
  );
  console.log(res);
}
