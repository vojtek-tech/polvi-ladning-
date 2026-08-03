import { createClient } from '@supabase/supabase-js';

/**
 * The Supabase client for the landing page.
 *
 * Config comes from import.meta.env, inlined at build time from polvi-landing/.env.
 * Those values are public by design — this is a frontend-only build, so everything
 * it needs is visible to the browser, and the VITE_ prefix marks that explicitly.
 * The security boundary is Row Level Security on the Supabase side, not the key.
 *
 * vite.config.ts validates both values (and refuses a service-role key) before the
 * build proceeds.
 */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL;

/**
 * Must be the same project as app.polvi.ai — the tokens in the shared cookie are
 * only valid against the project that issued them.
 *
 * persistSession + autoRefreshToken mean that once a session is adopted from the
 * shared cookie, this client keeps it alive in local storage and refreshes it
 * before expiry; the refreshed session is mirrored back to the cookie by
 * authBridge.ts's onAuthStateChange handler.
 */
export const supabase = createClient(SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
