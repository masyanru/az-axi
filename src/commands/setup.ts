import { installSessionStartHooks } from "axi-sdk-js";
import { AxiError } from "../errors.js";
import { parseAxiFlags } from "../args.js";

export async function setupCommand(args: string[]): Promise<Record<string, unknown>> {
  const flags = parseAxiFlags(args, { command: "setup" });
  if (flags.rest[0] !== "hooks" || flags.rest.length !== 1) {
    throw new AxiError("unknown setup command", "VALIDATION_ERROR", ["az-axi setup hooks"]);
  }
  if (!flags.execute) {
    return {
      setup: "hooks dry-run",
      help: ["az-axi setup hooks --execute"],
    };
  }
  await installSessionStartHooks({
    marker: "az-axi",
    binaryNames: ["az-axi"],
  });
  return { setup: "hooks installed or already up to date" };
}
