import { sha256 } from "npm:@cosmjs/crypto";
import { toHex } from "npm:@cosmjs/encoding";

import { TendermintClient } from "./deps.ts";

export async function transactionHash(
  client: TendermintClient,
  height: number,
  txIndex: number,
): Promise<string> {
  const block = await client.block(height);
  const tx = block.block.txs[txIndex];
  const hash = sha256(tx);
  return toHex(hash).toUpperCase();
}

export async function lastNBlocks(
  client: TendermintClient,
  maxHeight: number,
  n: number,
): Promise<[number, string][]> {
  const headers = await client.blockchain(maxHeight - n + 1, maxHeight);
  const results: [number, string][] = await Promise.all(headers.blockMetas.map(async (header) => {
    const { header: { height }, blockSize } = header;

    const resultsResult = await client.blockResults(height);
    // See https://github.com/tendermint/tendermint/issues/9555
    const [gasUsed, gasWanted] = resultsResult.results.reduce((acc, current) => {
      return [acc[0] + current.gasUsed, acc[1] + current.gasWanted];
    }, [0, 0]);
    const utilization = (gasWanted / 10_000000) * 100;
    return [
      height,
      `Utilization: ${utilization.toFixed(1)}%, Wanted: ${gasWanted}, Used: ${gasUsed}, Size: ${
        Math.floor(blockSize / 1024)
      } KiB`,
    ];
  }));
  return results.reverse();
}
