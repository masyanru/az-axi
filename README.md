# az-axi

Agent-facing Azure CLI. Wraps `az` with compact TOON output so agents spend fewer tokens than raw `az -o json`.

Stack: TypeScript, Node 20+, `axi-sdk-js`. The binary only **spawns** `az` — it does not import Azure CLI Python modules. New `az` versions and extensions appear through the live command index.

## Install

Requires [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) and Node 20+.

```sh
npx -y az-axi
npx -y az-axi doctor
npm install -g az-axi
```

Agent skill:

```sh
npx skills add masyanru/az-axi --skill az-axi -g
```

## Commands

```sh
az-axi                         # live subscription + resource groups
az-axi doctor                  # az, login, required extensions
az-axi services                # first-class nouns + installed groups
az-axi find hub                # search core + extension commands
az-axi group list
az-axi logs query -w <id> --analytics-query "Heartbeat | take 5"
az-axi az network vnet list    # any module
az-axi bench containerapp list # o200k token comparison
az-axi group create -n rg-x --execute
```

Anything that is not a read verb (`list`, `show`, `get`, `query`, `list-*`, `show-*`, …) is treated as a mutation and needs `--execute`. Production mutations can add `--confirm-subscription <id>`. Key Vault secret values are never printed unless `--reveal`.

## Tests

```sh
npm test
```

Token tests compare fixture `az -o json` against compacted TOON using the o200k tokenizer.
