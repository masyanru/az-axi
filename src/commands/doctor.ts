import { azJson, azRaw } from "../az.js";
import { REQUIRED_EXTENSIONS, DOMAINS } from "../domains.js";
import type { AzContext } from "../context.js";

type Check = { check: string; status: string; detail: string };

export async function doctorCommand(_args: string[], _ctx?: AzContext): Promise<Record<string, unknown>> {
  const checks: Check[] = [];

  const version = await azRaw(["version", "-o", "json"]);
  if (version.exitCode !== 0) {
    checks.push({ check: "az-cli", status: "error", detail: "az is not usable" });
  } else {
    let azVersion = "ok";
    try {
      const parsed = JSON.parse(version.stdout) as { "azure-cli"?: string };
      azVersion = parsed["azure-cli"] ?? "ok";
    } catch {
      azVersion = "ok";
    }
    checks.push({ check: "az-cli", status: "ok", detail: azVersion });
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
      detail: have[name] ?? `az extension add --name ${name}`,
    });
  }

  const firstClass = DOMAINS.map((domain) => domain.name).join("|");
  return {
    checks,
    first_class: firstClass,
    help: [
      "Install missing extensions, then rerun `az-axi doctor`",
      "Mutations still need `--execute`",
    ],
  };
}
