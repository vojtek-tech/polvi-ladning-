/**
 * Reads and writes the session cookie shared across the polvi.ai domains.
 *
 * app.polvi.ai writes the signed-in Supabase session into a cookie scoped to the
 * parent domain (.polvi.ai) so that polvi.ai can detect and reuse it. This module
 * is the only place that cookie's name, shape and attributes are defined.
 *
 * The cookie is deliberately NOT httpOnly — the browser client has to read it.
 * That makes its contents readable by any script on a polvi.ai origin, so:
 * never log token values from this module, and never widen the domain scope.
 */

/** Name of the cookie app.polvi.ai writes on the shared parent domain. */
export const SESSION_COOKIE_NAME = 'polvi-session';

/** Parent domain the cookie is scoped to, so every polvi.ai subdomain sees it. */
const COOKIE_DOMAIN = '.polvi.ai';

/** 7 days, matching the writer on the app side. */
const COOKIE_MAX_AGE_SECONDS = 604800;

/**
 * Tokens are JWTs / opaque refresh tokens and are always far longer than this.
 * The check exists to reject empty strings and obvious placeholder junk, not to
 * validate structure — Supabase does the real validation in setSession().
 */
const MIN_TOKEN_LENGTH = 10;

/** The token pair carried in the shared cookie. */
export interface CrossDomainSession {
  access_token: string;
  refresh_token: string;
}

function isToken(value: unknown): value is string {
  return typeof value === 'string' && value.length > MIN_TOKEN_LENGTH;
}

/**
 * True when the current page can legitimately touch the shared cookie, i.e. we
 * are on polvi.ai or one of its subdomains. Anywhere else (localhost, preview
 * hosts, a custom domain) writing a Domain=.polvi.ai cookie is silently rejected
 * by the browser, so we skip it rather than pretend it worked.
 */
export function canUseCrossDomainCookie(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'polvi.ai' || hostname.endsWith('.polvi.ai');
}

function readRawCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  for (const pair of document.cookie.split(';')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    // Split on the first '=' only: the value is URI-encoded JSON and can contain
    // '=' itself (base64 padding in the encoded tokens).
    if (pair.slice(0, eq).trim() !== name) continue;
    return pair.slice(eq + 1).trim();
  }
  return null;
}

/**
 * Reads the shared cookie and returns the token pair, or null if the cookie is
 * absent, malformed, or missing either token. Never throws.
 */
export function readCrossDomainSession(): CrossDomainSession | null {
  const raw = readRawCookie(SESSION_COOKIE_NAME);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(raw));
  } catch {
    // Truncated, double-encoded or hand-mangled cookie — treat as no session.
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const { access_token: accessToken, refresh_token: refreshToken } = parsed as Record<string, unknown>;
  if (!isToken(accessToken) || !isToken(refreshToken)) return null;

  return { access_token: accessToken, refresh_token: refreshToken };
}

/**
 * Writes the shared cookie, or clears it when passed null.
 *
 * Returns false without touching document.cookie when the current hostname is
 * outside polvi.ai, or when the given tokens fail the same validation the reader
 * applies — so a half-populated session can never overwrite a good cookie.
 */
export function writeCrossDomainSession(session: CrossDomainSession | null): boolean {
  if (typeof document === 'undefined' || !canUseCrossDomainCookie()) return false;

  const scope = `Domain=${COOKIE_DOMAIN}; Path=/`;

  if (session === null) {
    document.cookie = `${SESSION_COOKIE_NAME}=; ${scope}; Max-Age=0; SameSite=Lax; Secure`;
    return true;
  }

  if (!isToken(session.access_token) || !isToken(session.refresh_token)) return false;

  // Only the two tokens are persisted — the rest of a Supabase session object is
  // derivable from them and would just bloat a cookie that has a 4KB budget.
  const value = encodeURIComponent(
    JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }),
  );

  document.cookie =
    `${SESSION_COOKIE_NAME}=${value}; ${scope}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax; Secure`;
  return true;
}
