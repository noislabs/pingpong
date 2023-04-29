import { Config } from "./config.ts";
import { GasPrice } from "npm:@cosmjs/stargate";

export const testnet: Config = {
  // dapp chain
  endpoint: "https://rpc.cosmos.directory/juno",
  monitoringContract: "juno14d0ksh0kqj6plnlxh4zztml4ry8ru3nc4djmff8urqm0gmlrx8yqnz0w5x",
  proxyContract: "juno1qr84ktm57q5t02u04ddk5r8s79axdzglad6tfdd9g2xgt4hkh6jsgeq9x2",
  mnemonic: "exile another monster skin patient drink despair mule baby meadow pencil casino", // juno1c90jfas58mcf2ufuf0qer3xk3dvnz6zs029tf7
  feeDenom: "ujuno",
  addressPrefix: "juno",
  gasPrice: GasPrice.fromString(`0.025ujuno`),

  // nois chain (Testnet 005)
  noisEndpoint: "https://rpc.cosmos.directory/nois",
  drandContract: "nois19w26q6n44xqepduudfz2xls4pc5lltpn6rxu34g0jshxu3rdujzsj7dgu8",
};
