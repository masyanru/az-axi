import { AxiError, exitCodeForError } from "axi-sdk-js";

export { AxiError, exitCodeForError };

export function azNotInstalledError(): AxiError {
  return new AxiError(
    "Azure CLI is not installed",
    "AZ_NOT_INSTALLED",
    ["Install Azure CLI from https://learn.microsoft.com/cli/azure/install-azure-cli", "Then run `az-axi doctor`"],
  );
}

export function mapAzError(text: string, exitCode: number): AxiError {
  const message = firstErrorLine(text);

  if (/please run 'az login'|az login/i.test(text)) {
    return new AxiError("Azure auth required", "AUTH_REQUIRED", [
      "Authenticate Azure in a human terminal",
      "Then rerun `az-axi doctor`",
    ]);
  }

  if (/subscription.*not found|please explicitly select/i.test(text)) {
    return new AxiError("No Azure subscription selected", "AUTH_REQUIRED", [
      "Run `az-axi account list`",
      "Run `az-axi account set --subscription <id> --execute`",
    ]);
  }

  if (/the command requires the extension|extension .* not installed/i.test(text)) {
    return new AxiError("Required Azure CLI extension is missing", "EXTENSION_MISSING", [
      "Run `az-axi doctor` to see missing extensions",
    ]);
  }

  if (/already exists|already in use|already taken|conflict/i.test(text)) {
    return new AxiError(message || "Resource already exists", "ALREADY_EXISTS");
  }

  if (/not found|could not be found|resource.*does not exist|could not find/i.test(text)) {
    return new AxiError(message || "Azure resource not found", "NOT_FOUND");
  }

  if (/authorizationfailed|does not have authorization|forbidden/i.test(text)) {
    return new AxiError(message || "Insufficient Azure permissions", "FORBIDDEN");
  }

  if (/misspelled or not recognized|unrecognized arguments|unrecognized arguments:/i.test(text)) {
    return new AxiError(message || "Unknown flag or argument", "VALIDATION_ERROR", [
      `valid flags: --subscription, --resource-group/-g, --fields, --limit, --full, --reveal, --execute, --confirm-subscription (--help always allowed)`,
    ]);
  }

  if (exitCode === 2) {
    return new AxiError(message || "Invalid arguments", "VALIDATION_ERROR", [
      "Run `az-axi services` to find the command",
      "Run `az-axi <command> --help` for flags",
    ]);
  }

  return new AxiError(message || `Azure command failed (${exitCode})`, "UNKNOWN");
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
