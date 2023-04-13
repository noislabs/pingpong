FROM denoland/deno:alpine
COPY . /opt/pingpong
WORKDIR /opt/pingpong
CMD deno run --allow-read --allow-net --allow-env main.ts --mode=loop
