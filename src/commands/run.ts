import { AxiError } from "../errors.js";
import { parseAxiFlags, isInteractive, isMutating, type AxiFlags } from "../args.js";
import { azJson } from "../az.js";
import { compactAzPayload, type CompactResult } from "../compact.js";
import { DOMAIN_BY_NAME, type Domain } from "../domains.js";
import { compareTokens } from "../tokens.js";
import { encode } from "@toon-format/toon";
import type { AzContext } from "../context.js";

export async function runCommand(args: string[], ctx?: AzContext): Promise<Record<string, unknown>> {
  const flags = parseAxiFlags(args, { command: "az", allowUnknown: true });
  if (flags.rest.length === 0) {
    throw new AxiError("missing command", "VALIDATION_ERROR", [
      "az-axi az <module> <verb>",
      "az-axi services",
    ]);
  }
  return executeAz(flags.rest, flags, ctx);
}

export async function domainCommand(
  domain: Domain,
  args: string[],
  ctx?: AzContext,
): Promise<Record<string, unknown>> {
  const flags = parseAxiFlags(args, { command: domain.name, allowUnknown: true });
  return executeAz([...domain.azPrefix, ...flags.rest], flags, ctx, domain);
}

export async function benchCommand(args: string[], ctx?: AzContext): Promise<Record<string, unknown>> {
  const flags = parseAxiFlags(args, { command: "bench", allowUnknown: true });
  const commandArgs = flags.rest[0] === "az" ? flags.rest.slice(1) : flags.rest;
  if (commandArgs.length === 0) {
    throw new AxiError("missing command to benchmark", "VALIDATION_ERROR", ["az-axi bench group list"]);
  }
  if (isInteractive(commandArgs)) {
    throw new AxiError("interactive commands are blocked", "VALIDATION_ERROR");
  }
  const raw = await azJson(withScope(commandArgs, flags, ctx));
  const compact = compactAzPayload(raw, flags);
  const rawText = JSON.stringify(raw);
  const axiText = encode(formatCompact(compact, commandArgs, flags, undefined));
  return {
    command: commandArgs.join(" "),
    tokens: compareTokens(rawText, axiText),
    help: ["Use the axi output path for agent work; raw JSON is the baseline"],
  };
}

async function executeAz(
  azArgs: string[],
  flags: AxiFlags,
  ctx?: AzContext,
  domain?: Domain,
): Promise<Record<string, unknown>> {
  if (isInteractive(azArgs)) {
    throw new AxiError("interactive command blocked", "VALIDATION_ERROR", [
      "Run interactive Azure commands in a human terminal",
      "Use list/show/query verbs through az-axi",
    ]);
  }

  if (isMutating(azArgs) && !flags.execute) {
    const shown = domain ? [domain.name, ...azArgs.slice(domain.azPrefix.length)] : azArgs;
    throw new AxiError("mutation requires --execute", "VALIDATION_ERROR", [
      `Dry-run only. Re-run with --execute: az-axi ${shown.join(" ")} --execute`,
    ]);
  }

  if (flags.execute && flags.confirmSubscription) {
    const expected = flags.confirmSubscription;
    const current = flags.subscription ?? ctx?.subscription;
    if (current && current !== expected) {
      throw new AxiError(
        `confirm-subscription ${expected} does not match active subscription ${current}`,
        "VALIDATION_ERROR",
      );
    }
  }

  if (domain?.name === "keyvault" && azArgs.includes("secret") && azArgs.includes("show") && !flags.reveal) {
    flags.fields = flags.fields ?? ["name", "enabled", "contentType", "updated", "id"];
  }

  const scoped = withScope(azArgs, flags, ctx);
  try {
    const raw = await azJson(scoped);
    const compact = compactAzPayload(raw, flags);
    return formatCompact(compact, azArgs, flags, domain);
  } catch (error) {
    if (error instanceof AxiError && isDesiredState(azArgs, error)) {
      return {
        result: `${displayName(azArgs, domain)} already in desired state (no-op)`,
      };
    }
    throw error;
  }
}

function withScope(azArgs: string[], flags: AxiFlags, ctx?: AzContext): string[] {
  const out = [...azArgs];
  const subscription = flags.subscription ?? ctx?.subscription;
  const resourceGroup = flags.resourceGroup ?? ctx?.resourceGroup;
  if (subscription && !hasFlag(out, "--subscription")) {
    out.push("--subscription", subscription);
  }
  if (resourceGroup && !hasFlag(out, "--resource-group") && !hasFlag(out, "-g")) {
    out.push("--resource-group", resourceGroup);
  }
  return out;
}

function hasFlag(args: string[], name: string): boolean {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

function displayName(azArgs: string[], domain?: Domain): string {
  return domain?.name ?? azArgs.filter((arg) => !arg.startsWith("-")).join(" ") ?? "resource";
}

function mutatingVerb(azArgs: string[]): string | undefined {
  return azArgs.find(
    (arg) =>
      !arg.startsWith("-") &&
      (arg === "create" || arg === "add" || arg === "delete" || arg === "remove" || arg === "purge"),
  );
}

function isDesiredState(azArgs: string[], error: AxiError): boolean {
  const verb = mutatingVerb(azArgs);
  if ((verb === "create" || verb === "add") && error.code === "ALREADY_EXISTS") return true;
  if ((verb === "delete" || verb === "remove" || verb === "purge") && error.code === "NOT_FOUND") {
    return true;
  }
  return false;
}

function formatCompact(
  compact: CompactResult,
  azArgs: string[],
  flags: AxiFlags,
  domain?: Domain,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (domain) out.domain = domain.name;
  out.command = domain
    ? [domain.name, ...azArgs.slice(domain.azPrefix.length)].join(" ")
    : azArgs.join(" ");

  const label = domain?.description ?? "results";
  if (Array.isArray(compact.payload) && compact.total === 0) {
    out[domain?.name ?? "results"] = `0 ${label} found in this subscription`;
    return out;
  }

  if (Array.isArray(compact.payload)) {
    out.count =
      compact.total !== undefined && compact.total !== compact.count
        ? `${compact.count} of ${compact.total} total`
        : compact.count;
    out.items = compact.payload;
  } else {
    out.result = compact.payload;
  }

  const help: string[] = [];
  if (compact.truncated) {
    help.push(`az-axi ${out.command} --limit ${compact.total ?? "N"}`);
  }
  if (!flags.full) {
    help.push(`az-axi ${out.command} --full`);
  }
  if (flags.fields === undefined) {
    help.push(`az-axi ${out.command} --fields name,id,type`);
  }
  if (help.length > 0) out.help = help;
  return out;
}

export function getDomainHandler(name: string) {
  const domain = DOMAIN_BY_NAME[name];
  if (!domain) return undefined;
  return (args: string[], ctx?: AzContext) => domainCommand(domain, args, ctx);
}
