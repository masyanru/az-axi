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

export function parseAxiFlags(args: string[]): AxiFlags {
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
        throw usage(`${rawName} does not take a value`);
      }
      flags[boolKey] = true;
      continue;
    }

    const valueKey = VALUE_FLAGS[rawName];
    if (valueKey) {
      const value = inline ?? args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw usage(`${rawName} requires a value`);
      }
      if (inline === undefined) index += 1;
      assignValue(flags, valueKey, value);
      continue;
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
      throw usage("--limit must be a positive integer");
    }
    flags.limit = parsed;
    return;
  }
  flags[key] = value;
}

function usage(message: string): never {
  const error = new Error(message);
  error.name = "VALIDATION_ERROR";
  throw error;
}

export const MUTATING_VERBS: Record<string, true> = {
  create: true,
  delete: true,
  update: true,
  set: true,
  add: true,
  remove: true,
  start: true,
  stop: true,
  restart: true,
  scale: true,
  upgrade: true,
  apply: true,
  deploy: true,
  import: true,
  export: true,
  purge: true,
  recover: true,
  restore: true,
  backup: true,
  invoke: true,
  run: true,
  enable: true,
  disable: true,
  assign: true,
  attach: true,
  detach: true,
  rotate: true,
  reset: true,
  move: true,
  lock: true,
  unlock: true,
  grant: true,
  revoke: true,
  install: true,
  uninstall: true,
  up: true,
  down: true,
};

export const INTERACTIVE_COMMANDS = [
  ["login"],
  ["configure"],
  ["interactive"],
  ["feedback"],
  ["survey"],
  ["aks", "browse"],
  ["containerapp", "exec"],
  ["containerapp", "debug"],
  ["ssh", "vm"],
  ["ssh", "arc"],
  ["bastion", "ssh"],
  ["bastion", "rdp"],
  ["network", "bastion", "ssh"],
  ["network", "bastion", "rdp"],
];

export function isMutating(azArgs: string[]): boolean {
  return azArgs.some((arg) => !arg.startsWith("-") && MUTATING_VERBS[arg] === true);
}

export function isInteractive(azArgs: string[]): boolean {
  const verbs = azArgs.filter((arg) => !arg.startsWith("-"));
  return INTERACTIVE_COMMANDS.some(
    (pattern) =>
      pattern.length <= verbs.length &&
      pattern.every((part, index) => verbs[index] === part),
  );
}
