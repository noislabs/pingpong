export interface Config {
  // dapp chain
  endpoint: string;
  monitoringContract: string;
  proxyContract: string;
  mnemonic: string;
  feeDenom: string;
  addressPrefix: string;
  gasPrice: string;

  // nois chain (Testnet 005)
  noisEndpoint: string;
  drandContract: string;
}
