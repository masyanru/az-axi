import { afterEach, describe, expect, it } from "vitest";
import { resetAzRunner, setAzRunner } from "../src/az.js";
import { domainCommand, runCommand } from "../src/commands/run.js";
import { DOMAIN_BY_NAME } from "../src/domains.js";
import { AxiError } from "../src/errors.js";

afterEach(() => {
  resetAzRunner();
});

describe("runCommand", () => {
  it("requires --execute for mutations", async () => {
    await expect(runCommand(["group", "create", "-n", "rg-x"])).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: expect.stringMatching(/--execute/),
    });
  });

  it("blocks interactive login", async () => {
    await expect(runCommand(["login"])).rejects.toBeInstanceOf(AxiError);
  });

  it("compacts mocked list output", async () => {
    setAzRunner(async () => ({
      stdout: JSON.stringify([
        {
          id: "/subscriptions/x/resourceGroups/rg-a",
          name: "rg-a",
          location: "eastus",
          properties: { provisioningState: "Succeeded" },
          type: "Microsoft.Resources/resourceGroups",
          tags: { a: "b" },
        },
      ]),
      stderr: "",
      exitCode: 0,
    }));
    const out = await domainCommand(DOMAIN_BY_NAME.group!, ["list"]);
    expect(out.count).toBe(1);
    expect(out.items).toEqual([
      { name: "rg-a", location: "eastus", provisioningState: "Succeeded" },
    ]);
  });
});
