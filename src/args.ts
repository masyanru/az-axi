import { AxiError } from "./errors.js";
import { AXI_FLAGS } from "./help.js";

export type AxiFlags = {
  execute: boolean;
  full: boolean;
  reveal: boolean;
  fields?: string[];
  limit?: number;
  subscription?: string;
  resourceGroup?: string;
  confirmSubscription?: string;
  rest: string[];
};

export type ParseAxiOptions = {
  command: string;
  allowUnknown?: boolean;
};

const VALUE_FLAGS: Record<
  string,
  "fields" | "limit" | "subscription" | "resourceGroup" | "confirmSubscription"
> = {
  "--fields": "fields",
  "--limit": "limit",
  "--subscription": "subscription",
  "--resource-group": "resourceGroup",
  "-g": "resourceGroup",
  "--confirm-subscription": "confirmSubscription",
};

const BOOLEAN_FLAGS: Record<string, "execute" | "full" | "reveal"> = {
  "--execute": "execute",
  "--full": "full",
  "--reveal": "reveal",
};

export function parseAxiFlags(args: string[], options: ParseAxiOptions): AxiFlags {
  const flags: AxiFlags = {
    execute: false,
    full: false,
    reveal: false,
    rest: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    const [rawName, inline] = splitInline(arg);

    const boolKey = BOOLEAN_FLAGS[rawName];
    if (boolKey) {
      if (inline !== undefined) {
        throw usage(`${rawName} does not take a value`, options.command);
      }
      flags[boolKey] = true;
      continue;
    }

    const valueKey = VALUE_FLAGS[rawName];
    if (valueKey) {
      const value = inline ?? args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw usage(`${rawName} requires a value`, options.command);
      }
      if (inline === undefined) index += 1;
      assignValue(flags, valueKey, value, options.command);
      continue;
    }

    if (arg.startsWith("-") && options.allowUnknown !== true) {
      throw usage(`unknown flag ${rawName} for \`${options.command}\``, options.command);
    }

    flags.rest.push(arg);
  }

  return flags;
}

function splitInline(arg: string): [string, string | undefined] {
  if (!arg.startsWith("-")) return [arg, undefined];
  const eq = arg.indexOf("=");
  if (eq === -1) return [arg, undefined];
  return [arg.slice(0, eq), arg.slice(eq + 1)];
}

function assignValue(
  flags: AxiFlags,
  key: "fields" | "limit" | "subscription" | "resourceGroup" | "confirmSubscription",
  value: string,
  command: string,
): void {
  if (key === "fields") {
    flags.fields = value
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    return;
  }
  if (key === "limit") {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw usage("--limit must be a positive integer", command);
    }
    flags.limit = parsed;
    return;
  }
  flags[key] = value;
}

function usage(message: string, command: string): never {
  throw new AxiError(message, "VALIDATION_ERROR", [
    `valid flags for \`${command}\`: ${AXI_FLAGS}`,
  ]);
}

// Allowlist: a command runs without --execute only when its leaf verb is known
// to be read-only. Anything else — including verbs added in future az releases —
// is treated as a mutation.
const READ_VERBS: Record<string, true> = {
  show: true,
  list: true,
  get: true,
  wait: true,
  exists: true,
  query: true,
  check: true,
  status: true,
  stats: true,
  summarize: true,
  search: true,
  find: true,
  version: true,
  validate: true,
  "what-if": true,
  peek: true,
};

const READ_VERB_PREFIXES = ["show-", "list-", "get-", "check-", "query-", "validate-"];

// Read-shaped names that still change state: local kubeconfig files, or a
// probe pod deployed into the cluster.
const NOT_READ_VERBS: Record<string, true> = {
  "get-credentials": true,
  "get-admin-kubeconfig": true,
  "check-acr": true,
};

const READ_REST_METHODS: Record<string, true> = { get: true, head: true };

export const INTERACTIVE_COMMANDS = [
  ["login"],
  ["configure"],
  ["interactive"],
  ["feedback"],
  ["survey"],
  ["aks", "browse"],
  ["containerapp", "exec"],
  ["containerapp", "debug"],
  ["webapp", "exec"],
  ["webapp", "ssh"],
  ["webapp", "create-remote-connection"],
  ["ssh", "vm"],
  ["ssh", "arc"],
  ["bastion", "ssh"],
  ["bastion", "rdp"],
  ["network", "bastion", "ssh"],
  ["network", "bastion", "rdp"],
];

export function isMutating(azArgs: string[]): boolean {
  if (azArgs.some((arg) => arg === "--help" || arg === "-h")) return false;
  const path = commandPath(azArgs);
  if (path[0] === "rest") return !READ_REST_METHODS[restMethod(azArgs)];
  if (path[0] === "find" || (path.length === 1 && path[0] === "version")) return false;
  const verb = path.at(-1);
  if (!verb || NOT_READ_VERBS[verb]) return true;
  return !(READ_VERBS[verb] || READ_VERB_PREFIXES.some((prefix) => verb.startsWith(prefix)));
}

function commandPath(azArgs: string[]): string[] {
  const end = azArgs.findIndex((arg) => arg.startsWith("-"));
  return end === -1 ? azArgs : azArgs.slice(0, end);
}

function restMethod(azArgs: string[]): string {
  for (let index = 0; index < azArgs.length; index += 1) {
    const [name, inline] = splitInline(azArgs[index] ?? "");
    if (name === "--method" || name === "-m") {
      return (inline ?? azArgs[index + 1] ?? "").toLowerCase();
    }
  }
  return "get";
}

export function isInteractive(azArgs: string[]): boolean {
  const verbs = azArgs.filter((arg) => !arg.startsWith("-"));
  return INTERACTIVE_COMMANDS.some(
    (pattern) =>
      pattern.length <= verbs.length &&
      pattern.every((part, index) => verbs[index] === part),
  );
}
