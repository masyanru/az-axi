import { redactSecrets } from "./redact.js";

export type CompactOptions = {
  full?: boolean;
  fields?: string[];
  limit?: number;
  reveal?: boolean;
};

const DEFAULT_LIMIT = 100;
const PREVIEW_CHARS = 500;

const DROP_DEFAULT: Record<string, true> = {
  etag: true,
  systemData: true,
  managedBy: true,
  managedByTenants: true,
  tags: true,
  plan: true,
  extendedLocation: true,
  changedTime: true,
  createdTime: true,
  kind: true,
  identity: true,
  zones: true,
};

const TYPE_FIELDS: Record<string, string[]> = {
  "microsoft.resources/resourcegroups": ["name", "location", "provisioningState"],
  "microsoft.app/containerapps": [
    "name",
    "resourceGroup",
    "location",
    "provisioningState",
    "runningStatus",
    "fqdn",
  ],
  "microsoft.operationalinsights/workspaces": [
    "name",
    "resourceGroup",
    "location",
    "sku",
    "retentionInDays",
    "provisioningState",
  ],
  "microsoft.containerregistry/registries": [
    "name",
    "resourceGroup",
    "location",
    "loginServer",
    "sku",
  ],
  "microsoft.keyvault/vaults": ["name", "resourceGroup", "location"],
  "microsoft.eventhub/namespaces": ["name", "resourceGroup", "location", "status"],
  "microsoft.storage/storageaccounts": [
    "name",
    "resourceGroup",
    "location",
    "sku",
    "provisioningState",
  ],
  "microsoft.containerservice/managedclusters": [
    "name",
    "resourceGroup",
    "location",
    "provisioningState",
    "powerState",
    "kubernetesVersion",
  ],
  "microsoft.app/managedenvironments": [
    "name",
    "resourceGroup",
    "location",
    "provisioningState",
  ],
  "microsoft.operationalinsights/querypacks": ["name", "resourceGroup", "location"],
  "microsoft.insights/components": [
    "name",
    "resourceGroup",
    "location",
    "appType",
    "provisioningState",
  ],
  "microsoft.cdn/profiles": ["name", "resourceGroup", "location", "sku", "provisioningState"],
  "microsoft.databricks/workspaces": [
    "name",
    "resourceGroup",
    "location",
    "provisioningState",
  ],
  "microsoft.machinelearningservices/workspaces": [
    "name",
    "resourceGroup",
    "location",
    "provisioningState",
  ],
  "microsoft.logic/workflows": [
    "name",
    "type",
    "resourceGroup",
    "location",
    "state",
    "provisioningState",
  ],
  "microsoft.kusto/clusters": [
    "name",
    "type",
    "resourceGroup",
    "location",
    "state",
    "provisioningState",
  ],
  "microsoft.authorization/roleassignments": [
    "roleDefinitionName",
    "principalName",
    "principalType",
    "scope",
  ],
};

const DEFAULT_LIST_FIELDS = ["name", "type", "location", "resourceGroup", "provisioningState"];
const DEFAULT_SHOW_FIELDS = [
  "name",
  "id",
  "type",
  "location",
  "resourceGroup",
  "provisioningState",
  "sku",
  "fqdn",
  "status",
];

export type CompactResult = {
  payload: unknown;
  count?: number;
  total?: number;
  truncated: boolean;
};

export function compactAzPayload(data: unknown, options: CompactOptions = {}): CompactResult {
  const cleaned = redactSecrets(data, options.reveal === true);
  if (isLogAnalyticsResult(cleaned)) {
    return compactQueryTables(cleaned, options);
  }
  if (isGraphResult(cleaned)) {
    return compactList(cleaned.data, options, cleaned.count ?? cleaned.total_records);
  }
  if (Array.isArray(cleaned)) {
    return compactList(cleaned, options);
  }
  if (cleaned && typeof cleaned === "object") {
    return {
      payload: compactObject(cleaned as Record<string, unknown>, options, false),
      truncated: false,
    };
  }
  return { payload: cleaned, truncated: false };
}

function compactList(
  items: unknown[],
  options: CompactOptions,
  knownTotal?: number,
): CompactResult {
  const total = knownTotal ?? items.length;
  const limit = options.limit ?? DEFAULT_LIMIT;
  const slice = items.slice(0, limit);
  const rows = slice.map((item) =>
    item && typeof item === "object"
      ? compactObject(item as Record<string, unknown>, options, true)
      : item,
  );
  return {
    payload: rows,
    count: rows.length,
    total,
    truncated: total > rows.length,
  };
}

function compactObject(
  item: Record<string, unknown>,
  options: CompactOptions,
  isList: boolean,
): Record<string, unknown> {
  const lifted = liftFields(item);
  if (options.full) {
    const full = prune(lifted, options, true);
    return full && typeof full === "object" && !Array.isArray(full)
      ? (full as Record<string, unknown>)
      : lifted;
  }
  const typeKey = typeof lifted.type === "string" ? lifted.type.toLowerCase() : "";
  const armId = typeof lifted.id === "string" && lifted.id.startsWith("/subscriptions/");
  const secretId = typeof item.id === "string" && item.id.includes(".vault.azure.net/secrets");
  let fields =
    options.fields ??
    (secretId
      ? ["name", "enabled", "contentType", "updated"]
      : TYPE_FIELDS[typeKey] ??
        (armId || typeKey.startsWith("microsoft.")
          ? isList
            ? DEFAULT_LIST_FIELDS
            : DEFAULT_SHOW_FIELDS
          : Object.keys(item).filter((key) => key !== "TableName" && !key.startsWith("@"))));
  if (typeof item.type === "string" && !fields.includes("type")) {
    fields = ["type", ...fields];
  }
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (lifted[field] !== undefined && lifted[field] !== null) {
      out[field] = prune(lifted[field], options, false);
    }
  }
  return out;
}

function liftFields(item: Record<string, unknown>): Record<string, unknown> {
  const properties =
    item.properties && typeof item.properties === "object"
      ? (item.properties as Record<string, unknown>)
      : undefined;
  const sku = pickSku(item.sku) ?? (properties ? pickSku(properties.sku) : undefined);
  const configuration =
    properties?.configuration && typeof properties.configuration === "object"
      ? (properties.configuration as Record<string, unknown>)
      : undefined;
  const ingress =
    configuration?.ingress && typeof configuration.ingress === "object"
      ? (configuration.ingress as Record<string, unknown>)
      : undefined;

  const attributes =
    item.attributes && typeof item.attributes === "object"
      ? (item.attributes as Record<string, unknown>)
      : undefined;
  return {
    ...item,
    provisioningState:
      item.provisioningState ?? properties?.provisioningState ?? properties?.provisioning_state,
    runningStatus: properties?.runningStatus,
    fqdn: ingress?.fqdn ?? properties?.latestRevisionFqdn ?? properties?.fqdn,
    loginServer: item.loginServer ?? properties?.loginServer,
    retentionInDays: item.retentionInDays ?? properties?.retentionInDays,
    customerId: item.customerId ?? properties?.customerId,
    status: item.status ?? properties?.status ?? properties?.state,
    state: item.state ?? properties?.state,
    powerState: pickName(properties?.powerState) ?? pickName(item.powerState),
    kubernetesVersion: properties?.kubernetesVersion ?? item.kubernetesVersion,
    sku,
    resourceGroup: item.resourceGroup ?? resourceGroupFromId(item.id),
    enabled: item.enabled ?? attributes?.enabled,
    updated: item.updated ?? attributes?.updated,
  };
}

function pickSku(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" ? name : undefined;
  }
  return undefined;
}

function pickName(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "code" in value) {
    const code = (value as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

function resourceGroupFromId(id: unknown): string | undefined {
  if (typeof id !== "string") return undefined;
  const match = id.match(/\/resourceGroups\/([^/]+)/i);
  return match?.[1];
}

function prune(value: unknown, options: CompactOptions, keepAll: boolean): unknown {
  if (typeof value === "string") {
    if (!options.full && value.length > PREVIEW_CHARS) {
      return `${value.slice(0, PREVIEW_CHARS)}... (${value.length} chars total)`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => prune(item, options, keepAll));
  }
  if (!value || typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key.startsWith("@")) continue;
    if (child === null || child === undefined) continue;
    if (!keepAll && DROP_DEFAULT[key]) continue;
    if (Array.isArray(child) && child.length === 0) continue;
    if (typeof child === "object" && !Array.isArray(child) && Object.keys(child).length === 0) {
      continue;
    }
    out[key] = prune(child, options, keepAll);
  }
  return out;
}

function isLogAnalyticsResult(
  value: unknown,
): value is { tables: Array<{ name?: string; columns: unknown; rows: unknown[] }> } {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as { tables?: unknown }).tables)
  );
}

function isGraphResult(
  value: unknown,
): value is { data: unknown[]; count?: number; total_records?: number } {
  return !!value && typeof value === "object" && Array.isArray((value as { data?: unknown }).data);
}

function compactQueryTables(
  result: { tables: Array<{ name?: string; columns: unknown; rows: unknown[] }> },
  options: CompactOptions,
): CompactResult {
  const table = result.tables[0];
  if (!table) return { payload: { tables: 0 }, truncated: false };
  const columns = normalizeColumns(table.columns);
  const keep = options.fields ?? columns.filter((name) => name !== "Raw");
  const indexes = keep
    .map((name) => columns.indexOf(name))
    .filter((index) => index >= 0);
  const limit = options.limit ?? DEFAULT_LIMIT;
  const rows = table.rows.slice(0, limit).map((row) => {
    const values = Array.isArray(row) ? row : [];
    const object: Record<string, unknown> = {};
    for (const index of indexes) {
      const name = columns[index];
      if (name) object[name] = prune(values[index], options, false);
    }
    return object;
  });
  return {
    payload: rows,
    count: rows.length,
    total: table.rows.length,
    truncated: table.rows.length > rows.length,
  };
}

function normalizeColumns(columns: unknown): string[] {
  if (!Array.isArray(columns)) return [];
  return columns.map((column, index) => {
    if (typeof column === "string") return column;
    if (column && typeof column === "object" && "name" in column) {
      const name = (column as { name?: unknown }).name;
      if (typeof name === "string") return name;
    }
    return `c${index}`;
  });
}
