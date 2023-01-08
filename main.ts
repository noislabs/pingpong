import { parse } from "https://deno.land/std@0.171.0/flags/mod.ts";

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

  for (let i = 0; i < limit; i++) {
    await pingpoing();
  }
}
