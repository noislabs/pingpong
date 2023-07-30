# See https://hub.docker.com/r/denoland/deno/tags for available images
FROM denoland/deno:alpine-1.34.3

#These values are overriden in docker-compose.yaml
ARG CONFIG_FILE=config/uni-6/config.json
ARG SECRETS_FILE=config/uni-6/secrets.json

COPY . /opt/pingpong
WORKDIR /opt/pingpong
COPY $CONFIG_FILE /opt/pingpong/config.json
COPY $SECRETS_FILE /opt/pingpong/secrets.json

CMD deno run --allow-read --allow-net --allow-env main.ts --mode=loop
