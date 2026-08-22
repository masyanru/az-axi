import { encode } from "gpt-tokenizer/encoding/o200k_base";

export type TokenReport = {
  json_bytes: number;
  json_tokens: number;
  axi_bytes: number;
  axi_tokens: number;
  saved_tokens: number;
  saved_ratio: number;
};

export function countTokens(text: string): number {
  return encode(text).length;
}

export function compareTokens(rawJson: string, axiOutput: string): TokenReport {
  const json_tokens = countTokens(rawJson);
  const axi_tokens = countTokens(axiOutput);
  const saved_tokens = json_tokens - axi_tokens;
  return {
    json_bytes: rawJson.length,
    json_tokens,
    axi_bytes: axiOutput.length,
    axi_tokens,
    saved_tokens,
    saved_ratio: json_tokens === 0 ? 0 : saved_tokens / json_tokens,
  };
}
