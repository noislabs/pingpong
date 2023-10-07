import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { roundAfter as roundAfter } from "./drand.ts";

Deno.test("roundAfter works", () => {
  // UNIX epoch
  let round = roundAfter(BigInt(0));
  assertEquals(round, 1);

  // Before Drand genesis (https://api3.drand.sh/dbd506d6ef76e5f386f41c651dcb808c5bcbd75471cc4eafa3f4df7ad4e4c493/info)
  round = roundAfter(BigInt(1677685200) * 1_000_000_000n - 1n);
  assertEquals(round, 1);

  // At Drand genesis
  round = roundAfter(BigInt(1677685200) * 1_000_000_000n);
  assertEquals(round, 2);

  // After Drand genesis
  round = roundAfter(BigInt(1677685200) * 1_000_000_000n + 1n);
  assertEquals(round, 2);

  // Drand genesis +2s/3s/4s
  round = roundAfter((BigInt(1677685200) + 2n) * 1_000_000_000n);
  assertEquals(round, 2);
  round = roundAfter((BigInt(1677685200) + 3n) * 1_000_000_000n);
  assertEquals(round, 3);
  round = roundAfter((BigInt(1677685200) + 4n) * 1_000_000_000n);
  assertEquals(round, 3);
});
