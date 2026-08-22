import { execFile } from "node:child_process";
import { AxiError, azNotInstalledError, mapAzError } from "./errors.js";

export type ExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type AzRunner = (args: string[]) => Promise<ExecResult>;

const MAX_BUFFER_BYTES = 32 * 1024 * 1024;

let runner: AzRunner = defaultRunner;

export function setAzRunner(next: AzRunner): void {
  runner = next;
}

export function resetAzRunner(): void {
  runner = defaultRunner;
}

function defaultRunner(args: string[]): Promise<ExecResult> {
  const { promise, resolve } = Promise.withResolvers<ExecResult>();
  execFile(
    "az",
    args,
    {
      maxBuffer: MAX_BUFFER_BYTES,
      env: {
        ...process.env,
        AZURE_CORE_COLLECT_TELEMETRY: "no",
        AZURE_CORE_ONLY_SHOW_ERRORS: "true",
        AZURE_CORE_DISABLE_CONFIRM_PROMPT: "1",
      },
    },
    (error, stdout, stderr) => {
      const err = error as (Error & { code?: string | number }) | null;
      if (err?.code === "ENOENT") {
        resolve({ stdout: "", stderr: "ENOENT", exitCode: 127 });
        return;
      }
      resolve({
        stdout: stdout ?? "",
        stderr: stderr ?? "",
        exitCode: err ? (typeof err.code === "number" ? err.code : 1) : 0,
      });
    },
  );
  return promise;
}

export async function azRaw(args: string[]): Promise<ExecResult> {
  const result = await runner(args);
  if (result.stderr === "ENOENT") throw azNotInstalledError();
  return result;
}

export async function azJson<T = unknown>(args: string[]): Promise<T> {
  const forwarded = stripOutputFlags(args);
  const result = await azRaw([...forwarded, "--output", "json", "--only-show-errors"]);
  if (result.exitCode !== 0) {
    throw mapAzError([result.stderr, result.stdout].filter(Boolean).join("\n"), result.exitCode);
  }
  const text = result.stdout.trim();
  if (text.length === 0) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AxiError(`Unexpected az output: ${text.slice(0, 200)}`, "UNKNOWN");
  }
}

export async function azText(args: string[]): Promise<string> {
  const result = await azRaw([...stripOutputFlags(args), "--only-show-errors"]);
  if (result.exitCode !== 0) {
    throw mapAzError([result.stderr, result.stdout].filter(Boolean).join("\n"), result.exitCode);
  }
  return result.stdout;
}

function stripOutputFlags(args: string[]): string[] {
  const out: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (arg === "-o" || arg === "--output" || arg === "--only-show-errors") {
      if (arg === "-o" || arg === "--output") index += 1;
      continue;
    }
    if (arg.startsWith("-o=") || arg.startsWith("--output=")) continue;
    out.push(arg);
  }
  return out;
}
