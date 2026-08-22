import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import { compactAzPayload } from "../src/compact.js";
import { compareTokens } from "../src/tokens.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function measure(name: string, fields?: string[]) {
  const raw = readFileSync(join(fixtures, name), "utf8");
  const compact = compactAzPayload(JSON.parse(raw), fields ? { fields } : {});
  const axi = encode({
    count: compact.total !== undefined ? `${compact.count} of ${compact.total} total` : compact.count,
    items: compact.payload,
  });
  return compareTokens(raw, axi);
}

describe("token spend: raw az JSON vs az-axi", () => {
  it("cuts resource group list well below half", () => {
    const report = measure("group-list.json");
    expect(report.axi_tokens).toBeLessThan(report.json_tokens * 0.45);
    expect(report.saved_tokens).toBeGreaterThan(0);
  });

  it("cuts containerapp list by at least 70%", () => {
    const report = measure("containerapp-list.json");
    expect(report.saved_ratio).toBeGreaterThan(0.7);
  });

  it("cuts generic resource list by at least 50%", () => {
    const report = measure("resource-list.json");
    expect(report.saved_ratio).toBeGreaterThan(0.5);
  });

  it("cuts storage account list by at least 55%", () => {
    const report = measure("storage-list.json");
    expect(report.saved_ratio).toBeGreaterThan(0.55);
  });

  it("cuts log analytics query by dropping Raw", () => {
    const report = measure("log-analytics-query.json");
    expect(report.saved_ratio).toBeGreaterThan(0.45);
  });

  it("prints a comparable report shape", () => {
    const report = measure("acr-list.json");
    expect(report.json_tokens).toBeGreaterThan(report.axi_tokens);
    expect(report).toMatchObject({
      json_bytes: expect.any(Number),
      axi_bytes: expect.any(Number),
      saved_ratio: expect.any(Number),
    });
  });
});
