import { GasPrice } from "npm:@cosmjs/stargate";

export interface Config {
  // dapp chain
  endpoint: string;
  monitoringContract: string;
  proxyContract: string;
  mnemonic: string;
  feeDenom: string;
  addressPrefix: string;
  chainId: string;
  gasPrice: GasPrice;

  // nois chain (Testnet 005)
  noisEndpoint: string;
  drandContract: string;
}

export const testnet: Config = {
  // dapp chain
  endpoint: "https://juno-testnet-rpc.polkachu.com/",
  monitoringContract: "juno1zz9a5ewvhpx9m29qv6v8n74p2n376r3h89gqv0utu5v4fr85kuvqeg32gx",
  proxyContract: "juno1ythyt9wm9y4yxlv8eqccs4p78tylky5q0yx8gfpwycq6ywlycces87e20q",
  mnemonic: "exile another monster skin patient drink despair mule baby meadow pencil casino", // juno1c90jfas58mcf2ufuf0qer3xk3dvnz6zs029tf7
  feeDenom: "ujunox",
  addressPrefix: "juno",
  chainId: "uni-6",
  gasPrice: GasPrice.fromString(`0.025ujunox`),

  // nois chain (Testnet 005)
  noisEndpoint: "https://nois-testnet-rpc.polkachu.com:443/",
  drandContract: "nois14xef285hz5cx5q9hh32p9nztu3cct4g44sxjgx3dmftt2tj2rweqkjextk",
};
