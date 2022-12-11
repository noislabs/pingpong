import { Tendermint34Client } from "npm:@cosmjs/tendermint-rpc";

export async function lastNBlocks(
  client: Tendermint34Client,
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
