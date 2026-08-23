import { azJson } from "../az.js";
import { compactAzPayload } from "../compact.js";
import { REQUIRED_EXTENSIONS } from "../domains.js";
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
  const [account, groupsRaw, extensions] = await Promise.all([
    azJson<AccountShow>(["account", "show"]),
    azJson<unknown[]>(["group", "list"]),
    azJson<ExtensionRow[]>(["extension", "list"]).catch(() => [] as ExtensionRow[]),
  ]);
  const groups = compactAzPayload(groupsRaw, { limit: 8, fields: ["name", "location"] });
  const installed: Record<string, true> = {};
  for (const row of extensions ?? []) {
    if (row.name) installed[row.name] = true;
  }
  const missing = REQUIRED_EXTENSIONS.filter((name) => installed[name] !== true);
  const groupCount = Array.isArray(groupsRaw) ? groupsRaw.length : 0;

  return {
    azure: {
      status: account?.id ? "ok" : "error",
      subscription: account?.name ?? "",
      subscription_id: ctx?.subscription ?? account?.id ?? "",
      tenant: account?.tenantId ?? "",
      user: account?.user?.name ?? "",
    },
    groups_count: groupCount,
    groups: groupCount === 0 ? "0 resource groups found in this subscription" : groups.payload,
    extensions: {
      installed: Object.keys(installed).length,
      required_missing: missing.length,
    },
    commands: [
      { command: "doctor", use: "check login and extensions" },
      { command: "services", use: "list first-class nouns" },
      { command: "group", use: "resource groups" },
    ],
    help: ["az-axi doctor", "az-axi services", "az-axi group list"],
  };
}
