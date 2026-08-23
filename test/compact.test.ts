import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { compactAzPayload } from "../src/compact.js";
import { redactSecrets } from "../src/redact.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function load(name: string): unknown {
  return JSON.parse(readFileSync(join(fixtures, name), "utf8"));
}

describe("compactAzPayload", () => {
  it("keeps 3-4 fields on resource groups", () => {
    const result = compactAzPayload(load("group-list.json"));
    const rows = result.payload as Array<Record<string, unknown>>;
    expect(result.total).toBe(40);
    expect(rows.length).toBe(40);
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual(["location", "name", "provisioningState", "type"]);
    expect(rows[0]?.name).toBeTruthy();
    expect(rows[0]?.id).toBeUndefined();
  });

  it("collapses container apps to operational fields", () => {
    const result = compactAzPayload(load("containerapp-list.json"));
    const rows = result.payload as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(3);
    expect(rows[0]?.fqdn).toEqual(expect.any(String));
    expect(rows[0]?.runningStatus).toBe("Running");
    expect(rows[0]?.properties).toBeUndefined();
    expect(rows[0]?.systemData).toBeUndefined();
  });

  it("drops Raw from log analytics query rows", () => {
    const result = compactAzPayload(load("log-analytics-query.json"));
    const rows = result.payload as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(3);
    expect(rows[0]?.Computer).toBe("vm-web-01");
    expect(rows[0]?.Raw).toBeUndefined();
  });

  it("honors --fields including id", () => {
    const result = compactAzPayload(load("group-list.json"), { fields: ["name", "id"], limit: 2 });
    const rows = result.payload as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toMatch(/\/resourceGroups\//);
    expect(rows[0]?.location).toBeUndefined();
  });

  it("keeps flattened log-analytics rows instead of ARM fields", () => {
    const result = compactAzPayload([
      {
        ErrorCode: "ThrottlingException",
        EventName: "InvokeModelWithResponseStream",
        TableName: "PrimaryResult",
        events: "12",
      },
    ]);
    const rows = result.payload as Array<Record<string, unknown>>;
    expect(rows[0]).toEqual({
      ErrorCode: "ThrottlingException",
      EventName: "InvokeModelWithResponseStream",
      events: "12",
    });
  });

  it("keeps type on logic workflows and slims key vault secrets", () => {
    const mixed = compactAzPayload([
      {
        id: "/subscriptions/x/resourceGroups/rg/providers/Microsoft.Logic/workflows/wf",
        name: "wf",
        type: "Microsoft.Logic/workflows",
        location: "eastus",
        resourceGroup: "rg",
        properties: { provisioningState: "Succeeded" },
      },
    ]);
    expect((mixed.payload as Array<Record<string, unknown>>)[0]?.type).toBe(
      "Microsoft.Logic/workflows",
    );

    const secrets = compactAzPayload([
      {
        id: "https://kv.vault.azure.net/secrets/db-pass",
        name: "db-pass",
        contentType: "text",
        attributes: { enabled: true, updated: "2026-01-01T00:00:00Z", created: "2024-01-01T00:00:00Z" },
      },
    ]);
    expect((secrets.payload as Array<Record<string, unknown>>)[0]).toEqual({
      name: "db-pass",
      enabled: true,
      contentType: "text",
      updated: "2026-01-01T00:00:00Z",
    });
  });
});

describe("redactSecrets", () => {
  it("masks secret-like keys unless reveal is set", () => {
    const input = { name: "app", password: "hunter2", nested: { accessKey: "abc" } };
    expect(redactSecrets(input)).toEqual({ name: "app", password: "***", nested: { accessKey: "***" } });
    expect(redactSecrets(input, true)).toEqual(input);
  });
});
