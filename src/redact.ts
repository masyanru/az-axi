const SECRET_KEY =
  /^(password|passwd|secret|token|accesskey|access_key|connectionstring|connection_string|instrumentationkey|primarykey|primary_key|secondarykey|secondary_key|apikey|api_key|clientsecret|client_secret|sharedkey|sas|accountkey)$/i;

export function redactSecrets(value: unknown, reveal = false): unknown {
  if (reveal) return value;
  return redact(value);
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SECRET_KEY.test(key) && isSecretValue(child) ? "***" : redact(child);
    }
    return out;
  }
  return value;
}

function isSecretValue(value: unknown): boolean {
  return typeof value === "string" || typeof value === "number" || value == null;
}
