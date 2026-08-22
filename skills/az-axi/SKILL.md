---
name: az-axi
description: Use az-axi to discover, inspect, query, and safely mutate Azure through compact TOON CLI workflows over every az module.
---

# az-axi

Use `az-axi` instead of raw `az` for Azure work. Default output is compact TOON. Mutations require `--execute`. Secret values stay redacted unless `--reveal`.

```sh
npx -y az-axi
npx -y az-axi doctor
npx -y az-axi services
npx -y az-axi find <query>
npx -y az-axi az <group> <command>
npx -y az-axi group list
npx -y az-axi logs query -w <workspace-id> --analytics-query "<kql>"
npx -y az-axi bench containerapp list
```

First-class nouns wrap the matching `az` prefix: account, group, resource, graph, ad, role, identity, monitor, logs, insights, data-collection, containerapp, aks, acr, eventhubs, keyvault, kusto, logic, storage, network, databricks, sentinel, cdn, front-door, bastion, ssh, ml.

Any other module is `az-axi az <args>`. New az CLI versions show up through the live command index — do not dump `az -h` into context.
