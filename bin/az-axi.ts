#!/usr/bin/env node
import { tryFastPath } from "axi-sdk-js/fast-path";
import { VERSION } from "../src/version.js";

if (!tryFastPath(process.argv.slice(2), { version: VERSION })) {
  // Fast-path must not load the command graph; specifier is static but load is deferred.
  const { main } = await import("../src/cli.js");
  await main();
}
