import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { REQUIRED_EXTENSIONS } from "./domains.js";

export type CatalogGroup = {
  name: string;
  source: "core" | "extension";
  extension?: string;
};

export type InstalledExtension = {
  name: string;
  version?: string;
};

function readJsonFile(path: string): unknown {
  const text = readFileSync(path, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

export function loadCommandGroups(): CatalogGroup[] {
  const indexPath = join(homedir(), ".azure", "commandIndex.json");
  const groups: CatalogGroup[] = [];
  try {
    const parsed = readJsonFile(indexPath);
    if (parsed && typeof parsed === "object" && "commandIndex" in parsed) {
      const index = parsed.commandIndex;
      if (index && typeof index === "object") {
        for (const name of Object.keys(index as Record<string, unknown>)) {
          groups.push({ name, source: "core" });
        }
      }
    }
  } catch {
    // command index is rebuilt by az; missing file is not fatal
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name));
}

export function flattenExtensionCommands(): Array<{ command: string; extension: string }> {
  const treePath = join(homedir(), ".azure", "extensionCommandTree.json");
  try {
    const tree = readJsonFile(treePath);
    if (!tree || typeof tree !== "object") return [];
    const out: Array<{ command: string; extension: string }> = [];
    walk(tree, [], out);
    return out;
  } catch {
    return [];
  }
}

function walk(
  node: unknown,
  prefix: string[],
  out: Array<{ command: string; extension: string }>,
): void {
  if (!node || typeof node !== "object") return;
  if (typeof node === "string") {
    out.push({ command: prefix.join(" "), extension: node });
    return;
  }
  for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
    if (typeof child === "string") {
      out.push({ command: [...prefix, key].join(" "), extension: child });
    } else {
      walk(child, [...prefix, key], out);
    }
  }
}

export function findCommands(query: string, limit = 30): Array<{ command: string; extension?: string }> {
  const needle = query.toLowerCase();
  const hits: Array<{ command: string; extension?: string }> = [];
  for (const group of loadCommandGroups()) {
    if (group.name.includes(needle)) {
      hits.push({ command: group.name });
    }
  }
  for (const row of flattenExtensionCommands()) {
    if (row.command.toLowerCase().includes(needle) || row.extension.toLowerCase().includes(needle)) {
      hits.push(row);
    }
  }
  return hits.slice(0, limit);
}

export function missingRequiredExtensions(installed: InstalledExtension[]): string[] {
  const have: Record<string, true> = {};
  for (const ext of installed) have[ext.name] = true;
  return REQUIRED_EXTENSIONS.filter((name) => have[name] !== true);
}
