export type Domain = {
  name: string;
  azPrefix: string[];
  extension?: string;
  description: string;
  required: boolean;
};

export const DOMAINS: Domain[] = [
  { name: "account", azPrefix: ["account"], description: "subscriptions and tenants", required: true },
  { name: "group", azPrefix: ["group"], description: "resource groups", required: true },
  { name: "resource", azPrefix: ["resource"], description: "generic ARM resources", required: true },
  { name: "graph", azPrefix: ["graph"], extension: "resource-graph", description: "Azure Resource Graph", required: true },
  { name: "ad", azPrefix: ["ad"], description: "Microsoft Entra ID", required: true },
  { name: "role", azPrefix: ["role"], description: "Azure RBAC", required: true },
  { name: "identity", azPrefix: ["identity"], description: "managed identities", required: true },
  { name: "monitor", azPrefix: ["monitor"], description: "Azure Monitor", required: true },
  {
    name: "logs",
    azPrefix: ["monitor", "log-analytics"],
    extension: "log-analytics",
    description: "Log Analytics query and workspaces",
    required: true,
  },
  {
    name: "insights",
    azPrefix: ["monitor", "app-insights"],
    extension: "application-insights",
    description: "Application Insights",
    required: true,
  },
  {
    name: "data-collection",
    azPrefix: ["monitor", "data-collection"],
    extension: "monitor-control-service",
    description: "Monitor data collection",
    required: true,
  },
  { name: "containerapp", azPrefix: ["containerapp"], extension: "containerapp", description: "Container Apps", required: true },
  { name: "aks", azPrefix: ["aks"], description: "Azure Kubernetes Service", required: true },
  { name: "acr", azPrefix: ["acr"], description: "Azure Container Registry", required: true },
  { name: "eventhubs", azPrefix: ["eventhubs"], description: "Event Hubs", required: true },
  { name: "keyvault", azPrefix: ["keyvault"], description: "Key Vault", required: true },
  { name: "kusto", azPrefix: ["kusto"], extension: "kusto", description: "Azure Data Explorer", required: true },
  { name: "logic", azPrefix: ["logic"], extension: "logic", description: "Logic Apps (standard)", required: true },
  { name: "storage", azPrefix: ["storage"], description: "Storage accounts and data plane", required: true },
  { name: "network", azPrefix: ["network"], description: "Virtual networks and connectivity", required: true },
  { name: "databricks", azPrefix: ["databricks"], extension: "databricks", description: "Azure Databricks", required: true },
  { name: "sentinel", azPrefix: ["sentinel"], extension: "sentinel", description: "Microsoft Sentinel", required: true },
  { name: "cdn", azPrefix: ["cdn"], extension: "cdn", description: "CDN and Azure Front Door", required: true },
  { name: "front-door", azPrefix: ["network", "front-door"], extension: "front-door", description: "classic Front Door", required: true },
  { name: "bastion", azPrefix: ["network", "bastion"], extension: "bastion", description: "Azure Bastion", required: true },
  { name: "ssh", azPrefix: ["ssh"], extension: "ssh", description: "AAD SSH to VMs", required: true },
  { name: "ml", azPrefix: ["ml"], extension: "ml", description: "Azure Machine Learning", required: true },
];

export const DOMAIN_BY_NAME: Record<string, Domain> = Object.fromEntries(
  DOMAINS.map((domain) => [domain.name, domain]),
);

export const REQUIRED_EXTENSIONS = [
  ...new Set(DOMAINS.map((domain) => domain.extension).filter((name): name is string => !!name)),
];
