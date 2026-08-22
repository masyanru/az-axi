import { AxiError } from "../errors.js";
import { parseAxiFlags, isInteractive, isMutating, type AxiFlags } from "../args.js";
import { azJson } from "../az.js";
import { compactAzPayload, type CompactResult } from "../compact.js";
import { DOMAIN_BY_NAME, type Domain } from "../domains.js";
import { compareTokens } from "../tokens.js";
import { encode } from "@toon-format/toon";
import type { AzContext } from "../context.js";

export async function runCommand(args: string[], ctx?: AzContext): Promise<Record<string, unknown>> {
  const flags = parseAxiFlags(args);
  if (flags.rest.length === 0) {
    throw new AxiError("missing az command", "VALIDATION_ERROR", [
      "Run `az-axi az <group> <command>`",
      "Run `az-axi services` to list installed groups",
    ]);
  }
  return executeAz(flags.rest, flags, ctx);
}

export async function domainCommand(
  domain: Domain,
  args: string[],
  ctx?: AzContext,
): Promise<Record<string, unknown>> {
  const flags = parseAxiFlags(args);
  return executeAz([...domain.azPrefix, ...flags.rest], flags, ctx, domain);
}

export async function benchCommand(args: string[], ctx?: AzContext): Promise<Record<string, unknown>> {
  const flags = parseAxiFlags(args);
  const azArgs = flags.rest[0] === "az" ? flags.rest.slice(1) : flags.rest;
  if (azArgs.length === 0) {
    throw new AxiError("missing az command to benchmark", "VALIDATION_ERROR", [
      "Run `az-axi bench group list`",
    ]);
  }
  if (isInteractive(azArgs)) {
    throw new AxiError("interactive az commands are blocked", "VALIDATION_ERROR");
  }
  const raw = await azJson(withScope(azArgs, flags, ctx));
  const compact = compactAzPayload(raw, flags);
  const rawText = JSON.stringify(raw);
  const axiText = encode(formatCompact(compact, azArgs, flags, undefined));
  return {
    command: `az ${azArgs.join(" ")}`,
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
    throw new AxiError(
      `interactive command blocked: az ${azArgs.join(" ")}`,
      "VALIDATION_ERROR",
      ["Run that az command in a human terminal", "Use list/show/query verbs through az-axi"],
    );
  }

  if (isMutating(azArgs) && !flags.execute) {
    throw new AxiError("mutation requires --execute", "VALIDATION_ERROR", [
      `Dry-run only. Re-run with --execute to apply: az-axi az ${azArgs.join(" ")} --execute`,
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
  const raw = await azJson(scoped);
  const compact = compactAzPayload(raw, flags);
  return formatCompact(compact, azArgs, flags, domain);
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

function formatCompact(
  compact: CompactResult,
  azArgs: string[],
  flags: AxiFlags,
  domain?: Domain,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (domain) out.domain = domain.name;
  out.az = azArgs.join(" ");

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
    help.push(`Run with --limit ${compact.total ?? "N"} to see all ${compact.total} items`);
  }
  if (!flags.full) {
    help.push("Run with --full for untruncated fields");
  }
  if (flags.fields === undefined) {
    help.push("Run with --fields name,id,type to choose columns");
  }
  if (help.length > 0) out.help = help;
  return out;
}

export function getDomainHandler(name: string) {
  const domain = DOMAIN_BY_NAME[name];
  if (!domain) return undefined;
  return (args: string[], ctx?: AzContext) => domainCommand(domain, args, ctx);
}
