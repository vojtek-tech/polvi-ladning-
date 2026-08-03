import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Supabase config lives in polvi-landing/.env and is committed on purpose: this is
 * a frontend-only build, so anything the browser needs is public by definition. The
 * VITE_ prefix is the marker for that — Vite exposes only VITE_-prefixed variables
 * to client code via import.meta.env.
 *
 * Vite handles the actual inlining. What happens here is validation, so a missing,
 * malformed, or over-privileged key fails the build instead of shipping.
 */
const URL_VAR = 'VITE_SUPABASE_URL';
const ANON_KEY_VAR = 'VITE_SUPABASE_ANON_KEY';

/**
 * Unprefixed names a value might arrive under if an .env is copied from the app
 * repo. Checked only to produce a useful error: without the VITE_ prefix the value
 * would be invisible to the client and the page would fail at runtime instead.
 */
const LEGACY_ALIASES: Record<string, string[]> = {
  [URL_VAR]: ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'POLVI_SUPABASE_URL'],
  [ANON_KEY_VAR]: [
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'POLVI_SUPABASE_ANON_KEY',
  ],
};

/**
 * `publicEnv` is what the client will actually see (VITE_-prefixed only).
 * `allEnv` is used purely for diagnostics: it is the only place an unprefixed
 * alias is visible, and without it the rename hint below could never fire.
 */
function requireEnv(publicEnv: Record<string, string>, allEnv: Record<string, string>, name: string): string {
  const value = publicEnv[name]?.trim();
  if (value) return value;

  const present = (LEGACY_ALIASES[name] ?? []).filter((alias) => allEnv[alias]?.trim());
  throw new Error(
    present.length
      ? `${name} is not set, but ${present.join(', ')} is. Rename it to ${name}: Vite only ` +
        `exposes VITE_-prefixed variables to client code, so the unprefixed name would be ` +
        `undefined in the browser.`
      : `${name} is not set. See polvi-landing/.env.example — must be the same Supabase ` +
        `project as app.polvi.ai.`,
  );
}

/**
 * Refuses a service-role key. This is the check worth keeping: a publishable key in
 * client code is fine, but a privileged one would hand every visitor full access.
 */
function assertNotPrivileged(name: string, value: string): void {
  const [, payloadPart, signature] = value.split('.');
  if (!payloadPart || !signature) return; // Opaque publishable key — nothing to inspect.
  try {
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
    if (payload.role && payload.role !== 'anon') {
      throw new Error(
        `${name} is a "${payload.role}" key, not an anon/publishable key. It must never be ` +
          `shipped in a frontend build — move privileged work to a serverless function.`,
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('must never be shipped')) throw err;
    // Not a decodable JWT; nothing to check.
  }
}

export default defineConfig(({ mode }) => {
  const publicEnv = loadEnv(mode, process.cwd(), 'VITE_');
  const allEnv = loadEnv(mode, process.cwd(), '');

  const url = requireEnv(publicEnv, allEnv, URL_VAR);
  const anonKey = requireEnv(publicEnv, allEnv, ANON_KEY_VAR);

  if (!/^https:\/\/[^\s/]+/.test(url)) throw new Error(`${URL_VAR} must be an https:// URL.`);
  if (anonKey.length < 20) throw new Error(`${ANON_KEY_VAR} is too short to be a real key.`);
  assertNotPrivileged(ANON_KEY_VAR, anonKey);

  return {
    plugins: [react()],
    build: {
      // The generated page inlined every asset; keep real files instead so fonts and
      // images are cacheable.
      assetsInlineLimit: 4096,
    },
  };
});
