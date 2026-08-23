import { DOMAINS } from "./domains.js";

export const DESCRIPTION =
  "Compact Azure CLI for agents. Prefer az-axi over raw Azure JSON for discovery, inspect, and safe mutations.";

export const AXI_FLAGS =
  "--subscription, --resource-group/-g, --fields, --limit, --full, --reveal, --execute, --confirm-subscription (--help always allowed)";

export const TOP_HELP = `usage: az-axi [command] [args] [flags]
commands[8]{command,use}:
  doctor,check login and required extensions
  services,list first-class nouns and modules
  find,search installed commands
  group,resource groups
  logs,Log Analytics query
  containerapp,Container Apps
  az,any Azure module via compact passthrough
  setup,install session hooks
flags[9]:
  ${AXI_FLAGS}
examples:
  az-axi
  az-axi doctor
  az-axi group list
  az-axi logs query -w <workspace-id> --analytics-query "Heartbeat | take 5"
  az-axi az network vnet list
  az-axi bench containerapp list
`;

export function commandHelp(command: string): string {
  const domain = DOMAINS.find((item) => item.name === command);
  if (domain) {
    return `usage: az-axi ${domain.name} [args] [flags]
description: ${domain.description}
flags: ${AXI_FLAGS}
examples:
  az-axi ${domain.name} list
  az-axi ${domain.name} show -n <name>
  az-axi ${domain.name} create -n <name> --execute
`;
  }

  const extra: Record<string, string> = {
    doctor: `usage: az-axi doctor [flags]
description: Check Azure CLI, login, and required extensions
flags: ${AXI_FLAGS}
examples:
  az-axi doctor
`,
    services: `usage: az-axi services [query] [flags]
description: List first-class nouns and installed command groups
flags: ${AXI_FLAGS}
examples:
  az-axi services
  az-axi services hub
`,
    find: `usage: az-axi find <query> [flags]
description: Search core and extension commands
flags: ${AXI_FLAGS}
examples:
  az-axi find eventhub
  az-axi find log-analytics
`,
    az: `usage: az-axi az <module> [args] [flags]
description: Run any Azure module with compact TOON output. Mutations require --execute.
flags: ${AXI_FLAGS}
examples:
  az-axi az network vnet list
  az-axi az resource list
`,
    bench: `usage: az-axi bench <module> [args] [flags]
description: Compare o200k tokens for raw Azure JSON vs az-axi output
flags: ${AXI_FLAGS}
examples:
  az-axi bench group list
  az-axi bench containerapp list
`,
    setup: `usage: az-axi setup hooks [--execute]
description: Install SessionStart hooks for Claude Code, Codex, and OpenCode
flags: ${AXI_FLAGS}
examples:
  az-axi setup hooks
  az-axi setup hooks --execute
`,
    skill: `usage: az-axi skill generate [--check] [--output <path>]
description: Generate SKILL.md from the same guidance the CLI prints
flags: --check, --output, --help
examples:
  az-axi skill generate
  az-axi skill generate --check
`,
  };

  return extra[command] ?? TOP_HELP;
}
