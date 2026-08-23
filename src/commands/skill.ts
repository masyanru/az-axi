import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseAxiFlags } from "../args.js";
import { AxiError } from "../errors.js";
import { createSkillMarkdown } from "../skill.js";

const DEFAULT_OUTPUT = "skills/az-axi/SKILL.md";

export async function skillCommand(args: string[]): Promise<Record<string, unknown>> {
  const flags = parseAxiFlags(args, { command: "skill", allowUnknown: true });
  if (flags.rest[0] !== "generate") {
    throw new AxiError("unknown skill command", "VALIDATION_ERROR", ["az-axi skill generate --check"]);
  }

  const check = flags.rest.includes("--check") || process.argv.includes("--check");
  let output = DEFAULT_OUTPUT;
  const rest = flags.rest.slice(1).filter((arg) => arg !== "--check");
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index] ?? "";
    if (arg === "--output" && rest[index + 1]) {
      output = rest[index + 1] ?? output;
      index += 1;
      continue;
    }
    if (arg.startsWith("--output=")) {
      output = arg.slice("--output=".length);
      continue;
    }
    if (arg.startsWith("-")) {
      throw new AxiError(`unknown flag ${arg} for \`skill\``, "VALIDATION_ERROR", [
        "az-axi skill generate [--check] [--output <path>]",
      ]);
    }
  }

  const expected = createSkillMarkdown();
  const target = resolve(output);
  if (check) {
    let actual = "";
    try {
      actual = await readFile(target, "utf8");
    } catch {
      throw new AxiError(`missing ${output}`, "VALIDATION_ERROR", ["az-axi skill generate"]);
    }
    if (actual !== expected) {
      throw new AxiError(`${output} is stale`, "VALIDATION_ERROR", ["az-axi skill generate"]);
    }
    return { skill: "up to date", path: output };
  }

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, expected);
  return { skill: "wrote", path: output };
}
