import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import RealtimeStub, { RealtimeClient } from "../src/lib/supabase/no-realtime.ts";

// Blossom's browser build replaces @supabase/realtime-js with a stand-in,
// because nothing in the app has ever opened a realtime channel and the engine
// was 100KB shipped to everyone for nothing. next.config.ts does the aliasing;
// src/lib/supabase/no-realtime.ts is what lands in its place.
//
// The risk that makes this test worth having: supabase-js calls realtime
// methods on its own, without Blossom asking, from an auth listener it installs
// in its own constructor. setAuth is called on SIGNED_IN, TOKEN_REFRESHED and
// SIGNED_OUT. So a method missing from the stand-in is not a dormant gap, it is
// a TypeError thrown in the middle of somebody signing in, and nothing in the
// app would catch it.
//
// Nobody is going to remember to re-read supabase-js's source on every upgrade.
// This reads it for them: it finds every `this.realtime.<method>` in the
// installed package and insists the stand-in answers to all of them. When the
// upgrade adds a call, this fails at `npm test` rather than in front of a user.

const pkg = path.join("node_modules", "@supabase", "supabase-js", "dist", "index.mjs");
assert.ok(fs.existsSync(pkg), `expected the bundled client at ${pkg}`);
const source = fs.readFileSync(pkg, "utf8");

const called = new Set();
for (const match of source.matchAll(/this\.realtime\.([A-Za-z_$][\w$]*)/g)) {
  called.add(match[1]);
}

// If this is empty the regex has stopped matching, which would make the whole
// test silently pass while checking nothing.
assert.ok(
  called.size > 0,
  "found no realtime calls in supabase-js at all - the bundle's shape has changed and this test is no longer looking in the right place"
);

const instance = new RealtimeClient("wss://example.invalid/realtime/v1", {});

for (const name of [...called].sort()) {
  const value = instance[name];
  assert.ok(
    value !== undefined,
    `supabase-js calls realtime.${name}() but the stand-in has no such member. Add it to src/lib/supabase/no-realtime.ts before this reaches anyone.`
  );
  if (typeof value !== "function") continue;
  assert.equal(
    typeof value,
    "function",
    `realtime.${name} must be callable, supabase-js calls it as a method`
  );
}

// setAuth is the one that runs on an ordinary sign-in, so it gets checked by
// hand rather than only by name.
assert.ok(called.has("setAuth"), "expected supabase-js to still call realtime.setAuth");
assert.doesNotThrow(() => instance.setAuth("a-token"), "setAuth must survive a token");
assert.doesNotThrow(() => instance.setAuth(), "setAuth must survive being called with nothing, which is what sign-out does");

// The default and named exports both matter: supabase-js imports RealtimeClient
// by name, and the alias has to satisfy that import.
assert.equal(RealtimeClient, RealtimeStub, "the named and default exports must be the same class");

// Channels are the thing Blossom does not have. Asking for one should say so
// loudly rather than hand back something that silently never fires.
assert.throws(() => instance.channel(), /not bundled/i, "channel() must fail loudly, not return a dead object");
assert.deepEqual(instance.getChannels(), [], "there are never any channels");

console.log(
  `Supabase realtime stand-in checks passed (${called.size} methods supabase-js calls: ${[...called].sort().join(", ")}).`
);
