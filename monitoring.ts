// Contract information of the monitoring contract

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
