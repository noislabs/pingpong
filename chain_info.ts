import { StargateClient } from "npm:@cosmjs/stargate";

export interface ChainInfo {
  readonly chainId: string;
}

export async function getChainInfo(rpcEndpoint: string): Promise<ChainInfo> {
  const client = await StargateClient.connect(rpcEndpoint);
  const chainId = await client.getChainId();
  return {
    chainId,
  };
}
