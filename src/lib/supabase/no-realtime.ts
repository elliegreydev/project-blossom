/**
 * A stand-in for @supabase/realtime-js in the browser bundle only.
 *
 * Blossom does not use Supabase realtime. There is not a single call to
 * .channel(), .on() or .subscribe() anywhere in the app, and there never has
 * been - sync is a deliberate, explicit pass, not a live socket. But
 * supabase-js imports RealtimeClient at the top of its module and builds one
 * in its constructor, so the whole websocket engine shipped to every person
 * who opened the app, to sit there doing nothing.
 *
 * next.config.ts aliases the package to this file for the browser build ONLY.
 * The server keeps the real library, so nothing in the API routes changes.
 *
 * WHAT THIS HAS TO SATISFY, and why each one is here:
 *
 *   setAuth   supabase-js calls this itself, from an auth listener it installs
 *             in its own constructor, on SIGNED_IN, TOKEN_REFRESHED and
 *             SIGNED_OUT. This one is not optional: if it throws, it throws
 *             inside signing in and signing out.
 *   channel, getChannels, removeChannel, removeAllChannels
 *             the public surface supabase-js forwards to realtime. Nothing in
 *             Blossom calls them, but they are cheap to answer honestly.
 *   connect, disconnect
 *             not called by supabase-js today. Present so that a future
 *             version calling them does not crash.
 *
 * IF YOU UPGRADE @supabase/supabase-js: check whether it touches any realtime
 * method not listed above. `grep -n "this.realtime" node_modules/@supabase/
 * supabase-js/dist/index.mjs` is the whole check, and it takes a second. A
 * missing method here is a TypeError during sign-in, which is a bad way to
 * find out.
 */

class NoRealtimeClient {
  accessToken: string | null = null;
  channels: unknown[] = [];

  constructor(_url?: string, _options?: unknown) {
    // Deliberately does nothing. No socket is opened.
  }

  setAuth(token?: string | null): void {
    this.accessToken = token ?? null;
  }

  channel(): never {
    throw new Error(
      "Supabase realtime is not bundled in Blossom's browser build. If a feature now needs it, remove the alias in next.config.ts rather than working around this."
    );
  }

  getChannels(): unknown[] {
    return [];
  }

  async removeChannel(): Promise<"ok"> {
    return "ok";
  }

  async removeAllChannels(): Promise<"ok"[]> {
    return [];
  }

  connect(): void {}

  disconnect(): void {}
}

export { NoRealtimeClient as RealtimeClient };
export default NoRealtimeClient;
