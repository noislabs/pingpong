// Contract information of the monitoring contract

export const monitoringContract = "juno1zn5vnph494s7jhn9l43pkv4thmn4hef59dahuyfuhr46lwu6l55q7fx2mt";

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
