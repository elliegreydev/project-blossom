import { reportClientError } from "@/lib/clientErrorReport";
import { isDeviceStorageError } from "@/lib/errorShape";

// The net under everything in the browser, set up before React hydrates so it
// is already listening when the earliest failures happen.
//
// Blossom writes to this device first and syncs afterwards, so almost nothing
// in the app wraps its own save: a sheet calls into Dexie and trusts it. That
// is the right shape for the app and it means a broken IndexedDB surfaces here
// as an unhandled rejection rather than anywhere nearer the person. It is also
// the single worst thing that can go wrong in Blossom, because it is somebody
// writing something down and it not being kept.
//
// So storage failures are told apart from everything else. "Their phone can't
// store anything" and "something threw" need different answers from us, and
// one of them is urgent.

function operationFor(error: unknown) {
  return isDeviceStorageError(error)
    ? ("storing data on this device" as const)
    : ("an unexpected failure in the app" as const);
}

window.addEventListener("error", (event) => {
  // A failed image or script tag fires this too, with no error attached, as
  // does anything thrown from another origin. Neither tells us anything, so
  // only a real Error is worth passing on.
  if (!(event.error instanceof Error)) return;
  const error = event.error;
  reportClientError(operationFor(error), error, {
    severity: isDeviceStorageError(error) ? "fatal" : "error",
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  reportClientError(operationFor(reason), reason, {
    severity: isDeviceStorageError(reason) ? "fatal" : "error",
  });
});
