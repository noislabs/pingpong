import { parse } from "https://deno.land/std@0.171.0/flags/mod.ts";
import * as client from 'npm:prom-client';

import { pingpoing } from "./pingpong.ts";

const flags = parse(Deno.args, {
  string: ["mode"],
  default: {
    mode: "single",
  },
});

if (import.meta.main) {
  let limit: number;
  switch (flags.mode) {
    case "single":
      limit = 1;
      break;
    case "loop":
      limit = Number.MAX_SAFE_INTEGER;
      break;
    default:
      throw new Error("Argument mode must be 'single' or loop");
  }

  const gauge = new client.Gauge({
    name: 'e2e',
    help: 'End2end testing',
    labelNames: ['network', 'run'] as const,
  });
  
  for (let i = 0; i < limit; i++) {
    const time = await pingpoing();
    gauge.set({ network: 'uni-5', run: i }, time);
    const metrics = await client.register.metrics();
    console.log(metrics)
  }
}
