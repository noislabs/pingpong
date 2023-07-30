1. Download monitoring
   `wget https://github.com/noislabs/nois-contracts/releases/download/v0.11.0/nois_monitoring.wasm`
2. Upload and instantiate monitoring contract
   `deno run --allow-read --allow-net instantiate_monitoring.ts nois_monitoring.wasm`
3. (Optional) Create a secrets.json file in the root similar to secrets_template.json to override the config secret data. If you want a different mnemonic per chain, then create a file config/<chain>/secrets.json
4. Run `deno run --allow-read --allow-net --allow-env main.ts`
