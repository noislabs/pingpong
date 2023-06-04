export interface Config {
  // dapp chain
  endpoint: string;
  monitoringContract: string;
  proxyContract: string;
  /**
   * The denom in which the monitoring contract pays the proxy.
   * If unset, the first option provided by the proxy will be used.
   */
  priceDenom?: string | null;
  mnemonic: string;
  feeDenom: string;
  addressPrefix: string;
  gasPrice: string;

  // nois chain (Testnet 005)
  noisEndpoint: string;
  drandContract: string;

  sleep_time_minutes: number;
  timeout_time_seconds: number;
}
