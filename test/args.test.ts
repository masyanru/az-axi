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

  it("treats any verb outside the read allowlist as mutating", () => {
    for (const args of [
      ["vm", "deallocate", "-n", "vm-a", "--force-deallocate"],
      ["redis", "flush", "-n", "cache"],
      ["webapp", "deployment", "slot", "swap", "-n", "app", "--slot", "staging"],
      ["postgres", "flexible-server", "replica", "promote", "-n", "pg"],
      ["mysql", "flexible-server", "geo-restore", "-n", "db"],
      ["vmss", "lifecycle-hook-event", "approve", "--name", "evt"],
      ["webapp", "troubleshoot", "collect", "network-capture", "-n", "app"],
      ["aks", "nodepool", "auto-scale", "add", "--name", "np"],
      ["some-future-group", "brand-new-verb"],
    ]) {
      expect(isMutating(args), args.join(" ")).toBe(true);
    }
  });

  it("allows read verbs and read prefixes without --execute", () => {
    for (const args of [
      ["group", "show", "-n", "rg"],
      ["monitor", "log-analytics", "query", "-w", "id", "--analytics-query", "Heartbeat | take 5"],
      ["graph", "query", "-q", "Resources | project name"],
      ["containerapp", "revision", "list", "-n", "app"],
      ["storage", "account", "show-connection-string", "-n", "st"],
      ["acr", "check-name", "-n", "reg"],
      ["deployment", "group", "what-if", "-g", "rg", "-f", "main.bicep"],
      ["account", "get-access-token"],
      ["find", "keyvault"],
      ["version"],
    ]) {
      expect(isMutating(args), args.join(" ")).toBe(false);
    }
  });

  it("classifies only the command path, not flag values", () => {
    expect(isMutating(["group", "list", "--query", "delete"])).toBe(false);
    expect(isMutating(["group", "delete", "-n", "list"])).toBe(true);
    expect(isMutating(["webapp", "log", "config", "-n", "app"])).toBe(true);
  });

  it("keeps read-shaped verbs with local or cluster side effects gated", () => {
    expect(isMutating(["aks", "get-credentials", "-n", "aks"])).toBe(true);
    expect(isMutating(["aro", "get-admin-kubeconfig", "-n", "aro"])).toBe(true);
    expect(isMutating(["aks", "check-acr", "-n", "aks", "--acr", "x.azurecr.io"])).toBe(true);
  });

  it("gates az rest by HTTP method", () => {
    expect(isMutating(["rest", "--url", "https://management.azure.com/x"])).toBe(false);
    expect(isMutating(["rest", "--method", "GET", "--url", "u"])).toBe(false);
    expect(isMutating(["rest", "-m", "post", "--url", "u"])).toBe(true);
    expect(isMutating(["rest", "--method=delete", "--url", "u"])).toBe(true);
  });

  it("lets --help through for any command", () => {
    expect(isMutating(["group", "delete", "--help"])).toBe(false);
  });

  it("blocks interactive login and container shells", () => {
    expect(isInteractive(["login"])).toBe(true);
    expect(isInteractive(["containerapp", "exec"])).toBe(true);
    expect(isInteractive(["webapp", "exec", "-n", "app"])).toBe(true);
    expect(isInteractive(["webapp", "ssh", "-n", "app"])).toBe(true);
    expect(isInteractive(["containerapp", "list"])).toBe(false);
  });
});
