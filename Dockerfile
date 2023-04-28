FROM denoland/deno:alpine

ARG CONFIG_FILE
COPY . /opt/pingpong
WORKDIR /opt/pingpong
COPY $CONFIG_FILE /opt/pingpong/env.ts

CMD deno run --allow-read --allow-net --allow-env main.ts --mode=loop
