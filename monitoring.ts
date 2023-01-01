// Contract information of the monitoring contract

import { SearchByTagsQuery } from "npm:@cosmjs/cosmwasm-stargate";

export interface JobLifecycleRequest {
  height: number;
  tx_index: number | null;
  safety_margin: number;
  after: string;
}

export interface JobLifecycleDelivery {
  height: number;
  tx_index: number | null;
}

export type GetJobRequestResponse = JobLifecycleRequest | null;
export type GetJobDeliveryResponse = JobLifecycleDelivery | null;

export function txQueryRound(contractAddress: string, round: number): SearchByTagsQuery {
  return {
    tags: [
      {
        key: "wasm._contract_address",
        value: contractAddress,
      },
      {
        key: "wasm.round",
        value: round.toString(),
      },
    ],
  };
}
