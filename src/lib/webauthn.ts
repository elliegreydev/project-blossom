// Face ID / Touch ID / Windows Hello / Android biometric, as a faster
// alternative to typing the app-lock PIN.
//
// This is deliberately local-only: there's no server here to verify a
// signed challenge against, so the security guarantee isn't cryptographic
// proof - it's that navigator.credentials.get() can only resolve
// successfully once the browser's own platform-authenticator ceremony has
// genuinely succeeded on this device. A page's own JS can't fake that
// resolution, even without a server in the loop. That's the same trust
// model plenty of "unlock with biometrics" conveniences use elsewhere - it's
// a real gate, just not the kind that would hold up as a login system. The
// PIN (see hashPin in db.ts) stays the fallback and the thing actually
// being "unlocked".

export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function toBase64Url(buffer: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Registers a platform authenticator and returns its credential id
// (base64url) to store locally, or null if it wasn't available or the
// person cancelled/it failed.
export async function registerBiometricUnlock(): Promise<string | null> {
  if (!(await isPlatformAuthenticatorAvailable())) return null;
  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "Blossom", id: window.location.hostname },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: "blossom-device-unlock",
          displayName: "Blossom device unlock",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
      },
    });
    if (!credential || !("rawId" in credential)) return null;
    return toBase64Url((credential as PublicKeyCredential).rawId);
  } catch {
    return null;
  }
}

// Prompts the platform authenticator ceremony and reports whether it
// succeeded. A cancel, failure, or mismatch all just resolve to false -
// callers fall back to the PIN pad rather than surfacing a raw error.
export async function verifyBiometricUnlock(credentialId: string): Promise<boolean> {
  if (!(await isPlatformAuthenticatorAvailable())) return false;
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: fromBase64Url(credentialId), type: "public-key" }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return assertion !== null;
  } catch {
    return false;
  }
}
