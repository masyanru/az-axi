import { runAxiCli, AxiError, exitCodeForError } from "axi-sdk-js";
import { encode } from "@toon-format/toon";
import { VERSION } from "./version.js";
import { parseAxiFlags } from "./args.js";
import { DOMAINS } from "./domains.js";
import { DESCRIPTION, TOP_HELP, commandHelp } from "./help.js";
import type { AzContext } from "./context.js";
import { homeCommand } from "./commands/home.js";
import { doctorCommand } from "./commands/doctor.js";
import { findCommand, servicesCommand } from "./commands/services.js";
import { benchCommand, domainCommand, runCommand } from "./commands/run.js";
import { setupCommand } from "./commands/setup.js";
import { skillCommand } from "./commands/skill.js";

const commands: Record<string, (args: string[], ctx?: AzContext) => Promise<Record<string, unknown>>> = {
  doctor: doctorCommand,
  services: servicesCommand,
  find: findCommand,
  az: runCommand,
  bench: benchCommand,
  setup: setupCommand,
  skill: skillCommand,
};

for (const domain of DOMAINS) {
  commands[domain.name] = (args, ctx) => domainCommand(domain, args, ctx);
}

export async function main(options: { argv?: string[]; stdout?: { write: (chunk: string) => unknown } } = {}): Promise<void> {
  await runAxiCli<AzContext | undefined>({
    ...(options.argv ? { argv: options.argv } : {}),
    ...(options.stdout ? { stdout: options.stdout } : {}),
    description: DESCRIPTION,
    version: VERSION,
    topLevelHelp: TOP_HELP,
    home: homeCommand,
    commands,
    getCommandHelp: (command) => commandHelp(command),
    resolveContext: ({ args }) => {
      const flags = parseAxiFlags(args, { command: "context", allowUnknown: true });
      return {
        subscription: flags.subscription,
        resourceGroup: flags.resourceGroup,
      };
    },
    formatError: (error) => {
      const axiError =
        error instanceof AxiError
          ? error
          : new AxiError(error instanceof Error ? error.message : String(error), "UNKNOWN");
      return {
        output: `${encode({
          error: axiError.message,
          code: axiError.code,
          ...(axiError.suggestions.length > 0 ? { help: axiError.suggestions } : {}),
        })}\n`,
        exitCode: exitCodeForError(axiError),
      };
    },
  });
}

export { DESCRIPTION, TOP_HELP };
