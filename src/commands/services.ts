import { parseAxiFlags } from "../args.js";
import { findCommands, loadCommandGroups } from "../catalog.js";
import { DOMAINS } from "../domains.js";
import { AxiError } from "../errors.js";
import type { AzContext } from "../context.js";

export async function servicesCommand(args: string[], _ctx?: AzContext): Promise<Record<string, unknown>> {
  const flags = parseAxiFlags(args);
  const query = flags.rest[0];
  const groups = loadCommandGroups();
  const firstClass = DOMAINS.map((domain) => ({
    name: domain.name,
    az: domain.azPrefix.join(" "),
    extension: domain.extension ?? "core",
    use: domain.description,
  }));

  if (query) {
    const hits = findCommands(query, flags.limit ?? 40);
    if (hits.length === 0) {
      return {
        services: `0 commands matched ${query}`,
        help: ["Try a shorter token, e.g. `az-axi find hub`"],
      };
    }
    return {
      count: hits.length,
      services: hits,
      help: [`Run \`az-axi az ${hits[0]?.command} list\` or the matching first-class noun`],
    };
  }

  return {
    first_class_count: firstClass.length,
    first_class: firstClass,
    az_groups_count: groups.length,
    az_groups: groups.slice(0, flags.limit ?? 40).map((group) => group.name),
    help: [
      "Run `az-axi find <query>` to search core + extension commands",
      "Any hit is available via `az-axi az <command> ...`",
    ],
  };
}

export async function findCommand(args: string[], ctx?: AzContext): Promise<Record<string, unknown>> {
  const flags = parseAxiFlags(args);
  if (flags.rest.length === 0) {
    throw new AxiError("missing search query", "VALIDATION_ERROR", ["Run `az-axi find container`"]);
  }
  return servicesCommand(flags.rest, ctx);
}
