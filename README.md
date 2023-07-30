1. Download monitoring
   `wget https://github.com/noislabs/nois-contracts/releases/download/v0.11.0/nois_monitoring.wasm`
2. Upload and instantiate monitoring contract
   `deno run --allow-read --allow-net instantiate_monitoring.ts nois_monitoring.wasm`
3. (Optional) Create a secrets.json file under config/uni-6/secrets.json to override the mnemonics in the config . If you want to run many chains with docker-compose, place a different mnemonic per chain by creating a file config/[chain]/secrets.json
4. Run `deno run --allow-read --allow-net --allow-env main.ts`
