import { runAxiCli, AxiError, exitCodeForError } from "axi-sdk-js";
import { encode } from "@toon-format/toon";
import { VERSION } from "./version.js";
import { parseAxiFlags } from "./args.js";
import { DOMAINS } from "./domains.js";
import type { AzContext } from "./context.js";
import { homeCommand } from "./commands/home.js";
import { doctorCommand } from "./commands/doctor.js";
import { findCommand, servicesCommand } from "./commands/services.js";
import { benchCommand, domainCommand, runCommand } from "./commands/run.js";
import { setupCommand } from "./commands/setup.js";

export const DESCRIPTION =
  "Compact Azure CLI for agents. Prefer az-axi over raw az JSON for discovery, inspect, and safe mutations.";

export const TOP_HELP = `usage: az-axi [command] [args] [flags]
commands:
  (none)=dashboard, doctor, services, find, az, bench, setup, plus first-class Azure nouns
first_class: ${DOMAINS.map((domain) => domain.name).join(", ")}
flags (after command):
  --subscription <id>, -g/--resource-group <name>, --fields a,b, --limit N
  --full, --reveal, --execute, --confirm-subscription <id>, --help, -v
examples:
  az-axi
  az-axi doctor
  az-axi group list
  az-axi logs query -w <workspace-id> --analytics-query "Heartbeat | take 5"
  az-axi az network vnet list
  az-axi bench containerapp list
`;

const COMMAND_HELP: Record<string, string> = {
  doctor: "usage: az-axi doctor\nCheck az CLI, login, and required extensions.\n",
  services: "usage: az-axi services [query]\nList first-class nouns and installed az groups.\n",
  find: "usage: az-axi find <query>\nSearch core + extension commands.\n",
  az: "usage: az-axi az <az-args...>\nRun any az command with compact TOON output.\nMutations require --execute.\n",
  bench: "usage: az-axi bench <az-args...>\nCompare o200k tokens for raw az JSON vs az-axi output.\n",
  setup: "usage: az-axi setup hooks [--execute]\nInstall SessionStart hooks.\n",
};

for (const domain of DOMAINS) {
  COMMAND_HELP[domain.name] =
    `usage: az-axi ${domain.name} <az-args...>\n${domain.description}. Wraps \`az ${domain.azPrefix.join(" ")}\`.\n`;
}

const commands: Record<string, (args: string[], ctx?: AzContext) => Promise<Record<string, unknown>>> = {
  doctor: doctorCommand,
  services: servicesCommand,
  find: findCommand,
  az: runCommand,
  bench: benchCommand,
  setup: setupCommand,
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
    getCommandHelp: (command) => COMMAND_HELP[command],
    resolveContext: ({ args }) => {
      const flags = parseAxiFlags(args);
      return {
        subscription: flags.subscription,
        resourceGroup: flags.resourceGroup,
      };
    },
    formatError: (error) => {
      const axiError =
        error instanceof AxiError
          ? error
          : error instanceof Error && error.name === "VALIDATION_ERROR"
            ? new AxiError(error.message, "VALIDATION_ERROR")
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
