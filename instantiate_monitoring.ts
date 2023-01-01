import { SigningCosmWasmClient } from "npm:@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1HdWallet } from "npm:@cosmjs/proto-signing";
import { addressPrefix, endpoint, gasPrice, mnemonic, proxyContract } from "./env.ts";

const wasmPath = Deno.args[0];

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
  console.log("Upload:", upload);

  const res = await client.instantiate(
    address,
    upload.codeId,
    { nois_proxy: proxyContract },
    "A monitoring contract",
    "auto",
  );
  console.log("Instantiation:", res);
}
