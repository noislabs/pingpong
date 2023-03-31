import { SigningCosmWasmClient } from "npm:@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1HdWallet } from "npm:@cosmjs/proto-signing";
import { testnet } from "./env.ts";

const wasmPath = Deno.args[0];

if (import.meta.main) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(testnet.mnemonic, {
    prefix: testnet.addressPrefix,
  });
  const address = (await wallet.getAccounts())[0].address;
  console.log("Wallet address:", address);

  const client = await SigningCosmWasmClient.connectWithSigner(
    testnet.endpoint,
    wallet,
    { gasPrice: testnet.gasPrice },
  );

  const wasm = Deno.readFileSync(wasmPath);
  const upload = await client.upload(address, wasm, 1.1);
  console.log("Upload:", upload);

  const res = await client.instantiate(
    address,
    upload.codeId,
    { nois_proxy: testnet.proxyContract },
    "A monitoring contract",
    "auto",
  );
  console.log("Instantiation:", res);
}
