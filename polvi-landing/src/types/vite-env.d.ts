/// <reference types="vite/client" />

/**
 * Public client configuration, inlined by Vite at build time.
 *
 * Declared non-optional because vite.config.ts validates both before the build
 * proceeds — see the checks there.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
