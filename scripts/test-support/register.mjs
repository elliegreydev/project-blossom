// Installs the @/ alias resolver, then makes fake-indexeddb the global
// IndexedDB. Used via `node --import ./scripts/test-support/register.mjs`.
// Test-only.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
register("./alias-loader.mjs", pathToFileURL("./scripts/test-support/"));
await import("fake-indexeddb/auto");
