import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/**
 * Server-side verifier for Dynamic Labs JWTs.
 *
 * The client gets a JWT via the Dynamic SDK's getAuthToken() after
 * authenticating. We verify it against Dynamic's public JWKS before
 * trusting any claim (notably `sub`, which is the user ID).
 *
 * This is the only trust anchor linking a browser session to a Dynamic
 * user — do not parse tokens without verifying here.
 */

const ENV_ID =
  process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID ?? process.env.DYNAMIC_ENV_ID;

const JWKS_URL = ENV_ID
  ? `https://app.dynamicauth.com/api/v0/sdk/${encodeURIComponent(ENV_ID)}/.well-known/jwks`
  : null;

// createRemoteJWKSet caches keys + auto-refreshes on kid miss.
const jwks = JWKS_URL ? createRemoteJWKSet(new URL(JWKS_URL)) : null;

export type VerifiedDynamicToken = JWTPayload & { sub: string };

/**
 * Verify a Dynamic JWT and return its payload.
 * Throws on: missing config, malformed token, bad signature, expired token, missing sub.
 */
export async function verifyDynamicJwt(token: string): Promise<VerifiedDynamicToken> {
  if (!jwks) {
    throw new Error(
      "NEXT_PUBLIC_DYNAMIC_ENV_ID is not set — cannot verify Dynamic JWTs"
    );
  }

  const { payload } = await jwtVerify(token, jwks);

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Dynamic JWT missing sub claim");
  }

  return payload as VerifiedDynamicToken;
}
