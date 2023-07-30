export interface Config {
  // dapp chain
  endpoint: string;
  /** Address of the monitoring contract */
  monitoringContract: string;
  /** Address of the proxy contract */
  proxyContract: string;
  /**
   * The denom in which the monitoring contract pays the proxy.
   * If unset, the first option provided by the proxy will be used.
   */
  priceDenom?: string | null;
  feeDenom: string;
  addressPrefix: string;
  gasPrice: string;

  // nois chain (Testnet 005)
  noisEndpoint: string;
  /** Address of the gateway contract */
  gatewayContract: string;
  /** Address of the drand contract */
  drandContract: string;
  /** The channel ID by which the customer (proxy) is identified */
  customer: string;

  sleep_time_minutes: number;
  timeout_time_seconds: number;
}

export interface Secrets {
  // mnemonics
  mnemonic: string;
}
