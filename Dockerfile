FROM denoland/deno:alpine

ARG CONFIG_FILE=config/testnet.json
COPY . /opt/pingpong
WORKDIR /opt/pingpong
COPY $CONFIG_FILE /opt/pingpong/config.json

CMD deno run --allow-read --allow-net --allow-env main.ts --mode=loop
