import { parseAxiFlags } from "../args.js";
import { findCommands, loadCommandGroups } from "../catalog.js";
import { DOMAINS } from "../domains.js";
import { AxiError } from "../errors.js";
import type { AzContext } from "../context.js";

export async function servicesCommand(args: string[], _ctx?: AzContext): Promise<Record<string, unknown>> {
  const flags = parseAxiFlags(args, { command: "services" });
  const query = flags.rest[0];
  if (flags.rest.length > 1) {
    throw new AxiError(`unexpected argument ${flags.rest[1]} for \`services\``, "VALIDATION_ERROR", [
      "az-axi services [query]",
    ]);
  }

  const groups = loadCommandGroups();
  const firstClass = DOMAINS.map((domain) => ({
    name: domain.name,
    via: domain.azPrefix.join(" "),
    extension: domain.extension ?? "core",
    use: domain.description,
  }));

  if (query) {
    const hits = findCommands(query, flags.limit ?? 40);
    if (hits.length === 0) {
      return {
        services: `0 commands matched ${query}`,
        help: ["az-axi find hub"],
      };
    }
    const first = hits[0]?.command ?? "group";
    const noun = first.split(" ")[0] ?? "group";
    return {
      count: hits.length,
      services: hits,
      help: [`az-axi ${noun} list`],
    };
  }

  return {
    first_class_count: firstClass.length,
    first_class: firstClass,
    modules_count: groups.length,
    modules: groups.length === 0 ? "0 command groups found" : groups.slice(0, flags.limit ?? 40).map((group) => group.name),
    help: ["az-axi find <query>", "az-axi <noun> list"],
  };
}

export async function findCommand(args: string[], ctx?: AzContext): Promise<Record<string, unknown>> {
  const flags = parseAxiFlags(args, { command: "find" });
  if (flags.rest.length === 0) {
    throw new AxiError("missing search query", "VALIDATION_ERROR", ["az-axi find container"]);
  }
  return servicesCommand(flags.rest, ctx);
}
