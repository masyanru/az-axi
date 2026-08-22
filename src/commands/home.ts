import { azJson } from "../az.js";
import { compactAzPayload } from "../compact.js";
import { DOMAINS, REQUIRED_EXTENSIONS } from "../domains.js";
import type { AzContext } from "../context.js";

type AccountShow = {
  name?: string;
  id?: string;
  tenantId?: string;
  state?: string;
  user?: { name?: string; type?: string };
};

type ExtensionRow = { name?: string; version?: string };

export async function homeCommand(_args: string[], ctx?: AzContext): Promise<Record<string, unknown>> {
  const account = await azJson<AccountShow>(["account", "show"]);
  const groupsRaw = await azJson<unknown[]>(["group", "list"]);
  const groups = compactAzPayload(groupsRaw, { limit: 8, fields: ["name", "location"] });
  const extensions = await azJson<ExtensionRow[]>(["extension", "list"]).catch(() => []);
  const installed = new Set((extensions ?? []).map((row) => row.name).filter(Boolean));
  const missing = REQUIRED_EXTENSIONS.filter((name) => !installed.has(name));

  return {
    azure: {
      status: account?.id ? "ok" : "error",
      subscription: account?.name ?? "",
      subscription_id: ctx?.subscription ?? account?.id ?? "",
      tenant: account?.tenantId ?? "",
      user: account?.user?.name ?? "",
    },
    groups_count: Array.isArray(groupsRaw) ? groupsRaw.length : 0,
    groups: groups.payload,
    extensions: {
      installed: installed.size,
      required_missing: missing.length,
    },
    domains: DOMAINS.length,
    help: [
      "Run `az-axi doctor` to check az, login, and required extensions",
      "Run `az-axi services` to list installed az groups",
      "Run `az-axi az <group> list` for any module; first-class nouns skip the `az` prefix",
    ],
  };
}
