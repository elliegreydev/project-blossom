import assert from "node:assert/strict";
import { shouldApplyRemoteChange } from "../src/lib/sync-policy.ts";

assert.equal(shouldApplyRemoteChange(null, "2026-07-13T10:00:00.000Z"), true);
assert.equal(
  shouldApplyRemoteChange("2026-07-13T09:00:00.000Z", "2026-07-13T10:00:00.000Z"),
  true
);
assert.equal(
  shouldApplyRemoteChange("2026-07-13T10:00:00.000Z", "2026-07-13T10:00:00.000Z"),
  true
);
assert.equal(
  shouldApplyRemoteChange("2026-07-13T11:00:00.000Z", "2026-07-13T10:00:00.000Z"),
  false
);

console.log("Sync conflict policy checks passed.");

