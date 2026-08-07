import type { Instrumentation } from "next";
import { deliverErrorReport } from "@/lib/errorReport";
import { errorClassOf, serverRoute } from "@/lib/errorShape";

// The net under everything on the server.
//
// Next hands this any error it catches while rendering a page, running a route
// handler, running a server action or running the proxy, including all the
// ones nobody thought to wrap. The routes that matter report themselves, in
// their own words. This is for the failures nobody anticipated, which is why
// its operation is deliberately generic: naming it more precisely would be
// guessing.
//
// Awaited on purpose, unlike everywhere else. Next calls this after it has
// already captured the error, so there is no response sitting behind it, and
// the docs are explicit that async work here has to be awaited or it is
// dropped. deliverErrorReport never rejects and gives up after a few seconds.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  await deliverErrorReport({
    operation: "a request failing on the server",
    errorClass: errorClassOf(error),
    // routeType is one of four fixed words from Next. It says whether a page
    // render, a route handler, a server action or the proxy broke, which is
    // most of the answer, and it can't carry anything of anyone's.
    detail: context.routeType,
    severity: "error",
    // Resolving a session here would mean a Supabase round trip inside a hook
    // that runs on every server error, including the ones where Supabase is
    // the thing that's down. The route-level reports carry the account id.
    accountRef: null,
    context: {
      route: serverRoute(context.routePath),
      method: request.method,
    },
  });
};
