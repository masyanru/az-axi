import { DESCRIPTION, TOP_HELP } from "./help.js";

export const SKILL_DESCRIPTION =
  "Use az-axi to discover, inspect, query, and safely mutate Azure through compact TOON CLI workflows over every Azure CLI module.";

function yamlDoubleQuote(value: string): string {
  return JSON.stringify(value);
}

export function createSkillMarkdown(): string {
  return `---
name: az-axi
description: ${yamlDoubleQuote(SKILL_DESCRIPTION)}
user-invocable: false
---

# az-axi

${DESCRIPTION}

Invoke with \`npx -y az-axi <command>\`. If output suggests \`az-axi ...\`, run it as \`npx -y az-axi ...\`.
Requires Azure CLI installed and authenticated in a human terminal. Anything that is not a read verb (list, show, get, query, list-*, show-*, ...) needs \`--execute\`. Secret values stay redacted unless \`--reveal\`.

## Workflow

1. \`npx -y az-axi\` for live subscription context.
2. \`npx -y az-axi doctor\` before production work.
3. First-class nouns skip the passthrough prefix: \`group\`, \`logs\`, \`containerapp\`, \`aks\`, \`acr\`, \`eventhubs\`, \`keyvault\`, \`ad\`, \`monitor\`.
4. Any other module: \`npx -y az-axi az <module> <verb>\`.
5. Follow \`help:\` next steps. Do not dump Azure CLI \`--help\` into context.

## Commands

\`\`\`
${TOP_HELP.trim()}
\`\`\`
`;
}
