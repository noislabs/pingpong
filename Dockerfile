# See https://hub.docker.com/r/denoland/deno/tags for available images
FROM denoland/deno:alpine-1.34.3

ARG CONFIG_FILE=config/testnet.json
COPY . /opt/pingpong
WORKDIR /opt/pingpong
COPY $CONFIG_FILE /opt/pingpong/config.json

CMD deno run --allow-read --allow-net --allow-env main.ts --mode=loop
