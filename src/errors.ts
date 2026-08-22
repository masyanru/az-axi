import { AxiError, exitCodeForError } from "axi-sdk-js";

export { AxiError, exitCodeForError };

export function azNotInstalledError(): AxiError {
  return new AxiError(
    "az CLI is not installed — see https://learn.microsoft.com/cli/azure/install-azure-cli",
    "AZ_NOT_INSTALLED",
    ["Install Azure CLI, then run `az-axi doctor`"],
  );
}

export function mapAzError(text: string, exitCode: number): AxiError {
  const message = firstErrorLine(text);

  if (/please run 'az login'|az login/i.test(text)) {
    return new AxiError(
      "Azure auth required — run `az login` in a human terminal",
      "AUTH_REQUIRED",
      ["Then rerun `az-axi doctor`"],
    );
  }

  if (/subscription.*not found|please explicitly select/i.test(text)) {
    return new AxiError(message || "No Azure subscription selected", "AUTH_REQUIRED", [
      "Run `az-axi account list`",
      "Run `az-axi az account set --subscription <id>` --execute",
    ]);
  }

  if (/the command requires the extension|extension .* not installed/i.test(text)) {
    return new AxiError(message || "Required az extension is missing", "EXTENSION_MISSING", [
      "Run `az-axi doctor` to see missing extensions",
    ]);
  }

  if (/not found|could not be found|resource.*does not exist/i.test(text)) {
    return new AxiError(message || "Azure resource not found", "NOT_FOUND");
  }

  if (/authorizationfailed|does not have authorization|forbidden/i.test(text)) {
    return new AxiError(message || "Insufficient Azure permissions", "FORBIDDEN");
  }

  if (exitCode === 2) {
    return new AxiError(message || "Invalid az arguments", "VALIDATION_ERROR", [
      "Run `az-axi services` to find the command",
      "Run `az-axi az <group> --help` for flags",
    ]);
  }

  return new AxiError(message || `az exited with code ${exitCode}`, "UNKNOWN");
}

function firstErrorLine(text: string): string {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !trimmed.startsWith("WARNING:")) {
      return trimmed.replace(/^ERROR:\s*/i, "");
    }
  }
  return "";
}
