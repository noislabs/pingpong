import { toUtf8 } from "npm:@cosmjs/encoding";

/** Prints a newline to STDOUT */
export function nl() {
  Deno.stdout.writeSync(new Uint8Array([0x0a]));
}

/** Prints a dot to STDOUT */
export function dot() {
  Deno.stdout.writeSync(new Uint8Array([0x2e]));
}

/** Write string to STDOUT without adding a line break */
export function writeStdout(input: string) {
  Deno.stdout.writeSync(toUtf8(input));
}

export function debugLog(msg: string) {
  writeStdout(`[${new Date().toISOString()}] ` + msg + "\n");
}
