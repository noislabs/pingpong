import { Config } from "./config.ts";
import { GasPrice } from "npm:@cosmjs/stargate";

export const testnet: Config = {
  // dapp chain
  endpoint: "https://juno-testnet-rpc.polkachu.com/",
  monitoringContract: "juno1djtv36ctz4tmxw8vmfwtqmxdchcgygxsfvffmacynt9c08jeu0sqx87lf6",
  proxyContract: "juno13atw6x2vlvckz7fx89dc8zz7e83ysj3m8rs5dazcwj8scdwugn8s89wwqc",
  mnemonic: "exile another monster skin patient drink despair mule baby meadow pencil casino", // juno1c90jfas58mcf2ufuf0qer3xk3dvnz6zs029tf7
  feeDenom: "ujunox",
  addressPrefix: "juno",
  chainId: "uni-6",
  gasPrice: GasPrice.fromString(`0.025ujunox`),

  // nois chain (Testnet 005)
  noisEndpoint: "https://nois-testnet-rpc.polkachu.com:443/",
  drandContract: "nois14xef285hz5cx5q9hh32p9nztu3cct4g44sxjgx3dmftt2tj2rweqkjextk",
};
