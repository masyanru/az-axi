import { installSessionStartHooks } from "axi-sdk-js";
import { AxiError } from "../errors.js";
import { parseAxiFlags } from "../args.js";

export async function setupCommand(args: string[]): Promise<Record<string, unknown>> {
  const flags = parseAxiFlags(args);
  if (flags.rest[0] !== "hooks") {
    throw new AxiError("unknown setup command", "VALIDATION_ERROR", ["Run `az-axi setup hooks`"]);
  }
  if (!flags.execute) {
    return {
      setup: "hooks dry-run",
      help: ["Re-run `az-axi setup hooks --execute` to install SessionStart hooks"],
    };
  }
  await installSessionStartHooks({
    marker: "az-axi",
    binaryNames: ["az-axi"],
  });
  return { setup: "hooks installed or already up to date" };
}
