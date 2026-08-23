import { describe, expect, it } from "vitest";
import { isInteractive, isMutating, parseAxiFlags } from "../src/args.js";

describe("parseAxiFlags", () => {
  it("strips axi flags and keeps command args", () => {
    const parsed = parseAxiFlags(
      ["list", "-g", "rg-app", "--limit", "5", "--fields", "name,location", "--execute"],
      { command: "group", allowUnknown: true },
    );
    expect(parsed.rest).toEqual(["list"]);
    expect(parsed.resourceGroup).toBe("rg-app");
    expect(parsed.limit).toBe(5);
    expect(parsed.fields).toEqual(["name", "location"]);
    expect(parsed.execute).toBe(true);
  });

  it("rejects empty --limit", () => {
    expect(() => parseAxiFlags(["list", "--limit", "nope"], { command: "group" })).toThrow(
      /positive integer/,
    );
  });

  it("rejects unknown flags in strict mode", () => {
    expect(() => parseAxiFlags(["--axi-probe-unknown-flag"], { command: "doctor" })).toThrow(
      /unknown flag/,
    );
  });
});

describe("verb classification", () => {
  it("treats create/delete as mutating and list as not", () => {
    expect(isMutating(["group", "create", "-n", "x"])).toBe(true);
    expect(isMutating(["group", "list"])).toBe(false);
  });

  it("blocks interactive login and containerapp exec", () => {
    expect(isInteractive(["login"])).toBe(true);
    expect(isInteractive(["containerapp", "exec"])).toBe(true);
    expect(isInteractive(["containerapp", "list"])).toBe(false);
  });
});
