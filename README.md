1. Download monitoring
   `wget https://github.com/noislabs/nois-contracts/releases/download/v0.11.0/nois_monitoring.wasm`
1. Upload and instantiate monitoring contract
   `deno run --allow-read --allow-net instantiate_monitoring.ts nois_monitoring.wasm`
1. Run `deno run --allow-read --allow-net --allow-env main.ts`
