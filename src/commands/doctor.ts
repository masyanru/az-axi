import { parseAxiFlags } from "../args.js";
import { azJson, azRaw } from "../az.js";
import { REQUIRED_EXTENSIONS, DOMAINS } from "../domains.js";
import { AxiError } from "../errors.js";
import type { AzContext } from "../context.js";

type Check = { check: string; status: string; detail: string };

export async function doctorCommand(args: string[], _ctx?: AzContext): Promise<Record<string, unknown>> {
  const flags = parseAxiFlags(args, { command: "doctor" });
  if (flags.rest.length > 0) {
    throw new AxiError(`unexpected argument ${flags.rest[0]} for \`doctor\``, "VALIDATION_ERROR", [
      "az-axi doctor",
    ]);
  }

  const checks: Check[] = [];
  const version = await azRaw(["version", "-o", "json"]);
  if (version.exitCode !== 0) {
    checks.push({ check: "azure-cli", status: "error", detail: "Azure CLI is not usable" });
  } else {
    let cliVersion = "ok";
    try {
      const parsed = JSON.parse(version.stdout) as { "azure-cli"?: string };
      cliVersion = parsed["azure-cli"] ?? "ok";
    } catch {
      cliVersion = "ok";
    }
    checks.push({ check: "azure-cli", status: "ok", detail: cliVersion });
  }

  try {
    const account = await azJson<{ name?: string; id?: string }>(["account", "show"]);
    checks.push({
      check: "login",
      status: account?.id ? "ok" : "error",
      detail: account?.name ?? account?.id ?? "no subscription",
    });
  } catch (error) {
    checks.push({
      check: "login",
      status: "error",
      detail: error instanceof Error ? error.message : "not logged in",
    });
  }

  const installed = await azJson<Array<{ name?: string; version?: string }>>(["extension", "list"]).catch(
    () => [],
  );
  const have: Record<string, string> = {};
  for (const row of installed ?? []) {
    if (row.name) have[row.name] = row.version ?? "installed";
  }

  for (const name of REQUIRED_EXTENSIONS) {
    checks.push({
      check: `ext:${name}`,
      status: have[name] ? "ok" : "missing",
      detail: have[name] ?? `install the ${name} extension, then az-axi doctor`,
    });
  }

  return {
    checks,
    first_class: DOMAINS.map((domain) => domain.name).join("|"),
    help: ["az-axi services", "Mutations need --execute"],
  };
}
