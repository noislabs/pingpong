import { GasPrice } from "npm:@cosmjs/stargate";

// dapp chain
export const endpoint = "https://juno-testnet-rpc.polkachu.com/";
export const monitoringContract = "juno1pfgm9qt6cjjjduwvrn5xpuyfur9x3m8pcefljppt0lpl7gsk4txqajjhvn";
export const proxyContract = "juno1qaxkgcrhwxd49amdjyhhf0rxlsvgw4qztuuw8gs02luj79su2cusaq0pxr";
export const mnemonic =
  "exile another monster skin patient drink despair mule baby meadow pencil casino";
export const feeDenom = "ujunox";
export const addressPrefix = "juno";
export const gasPrice = GasPrice.fromString(`0.025${feeDenom}`);

// nois chain
export const noisEndpoint = "https://nois.rpc.bccnodes.com/";
export const drandContract = "nois14ex94lcyfsyjy3mj470yernkxykh2jvcvuepa63utqeuq4gggvmqx5sjm2";
