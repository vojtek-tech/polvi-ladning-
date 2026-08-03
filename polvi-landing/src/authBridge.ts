/**
 * The landing page's auth bridge.
 *
 * Imported first from main.jsx so it runs before anything renders, and exposes a
 * small read-only API (`polviAuth`) that components subscribe to.
 *
 * Responsibilities:
 *  1. Register onAuthStateChange first, so no session change is missed.
 *  2. If this client has no session of its own, adopt one from the shared
 *     .polvi.ai cookie written by app.polvi.ai.
 *  3. Mirror every session back into that cookie, and clear it on sign-out, so
 *     login and logout stay in sync in both directions.
 *
 * Nothing here logs token values.
 */

import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import { readCrossDomainSession, writeCrossDomainSession } from './lib/crossDomainSession';

/**
 * 'loading' until the session question is settled. Components render a neutral
 * placeholder for it, which is what prevents a flash of the signed-out CTA on a
 * page load that is about to resolve to signed-in.
 */
export type PolviAuthState = 'loading' | 'signed-in' | 'signed-out';

export interface PolviAuthSnapshot {
  state: PolviAuthState;
  hasSession: boolean;
  appDashboardUrl: string;
  signInUrl: string;
  signUpUrl: string;
}

const APP_DASHBOARD_URL = 'https://app.polvi.ai/dashboard';
const APP_SIGN_IN_URL = 'https://app.polvi.ai/auth';
const APP_SIGN_UP_URL = 'https://app.polvi.ai/auth?mode=signup';

/** Also dispatched on window, for consumers that prefer events to subscribe(). */
const CHANGE_EVENT = 'polvi:authstatechange';

type Listener = (snapshot: PolviAuthSnapshot) => void;

const listeners = new Set<Listener>();
let state: PolviAuthState = 'loading';

/**
 * While true, a null session is not yet proof of being signed out — we may still
 * be about to adopt one from the cookie. Guards against the INITIAL_SESSION event
 * (which fires with a null session before bootstrap finishes) publishing
 * 'signed-out' and causing the exact flash we are trying to avoid.
 */
let bootstrapping = true;

function snapshot(): PolviAuthSnapshot {
  return {
    state,
    hasSession: state === 'signed-in',
    appDashboardUrl: APP_DASHBOARD_URL,
    signInUrl: APP_SIGN_IN_URL,
    signUpUrl: APP_SIGN_UP_URL,
  };
}

function publish(next: PolviAuthState): void {
  if (next === state) return;
  state = next;
  const current = snapshot();

  // Copy first: a listener that unsubscribes itself must not perturb iteration.
  for (const listener of [...listeners]) {
    try {
      listener(current);
    } catch (err) {
      console.warn('[polvi-auth] listener threw:', err instanceof Error ? err.message : String(err));
    }
  }

  window.dispatchEvent(new CustomEvent<PolviAuthSnapshot>(CHANGE_EVENT, { detail: current }));
}

function mirrorToCookie(session: Session): void {
  writeCrossDomainSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Registered before any session lookup, so a session arriving from setSession(),
 * a token refresh, or a sign-out in another tab all flow through one path.
 */
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    // Covers INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED and USER_UPDATED: any
    // session this client holds is the one the cookie should carry.
    mirrorToCookie(session);
    publish('signed-in');
    return;
  }

  if (event === 'SIGNED_OUT') {
    writeCrossDomainSession(null);
    publish('signed-out');
    return;
  }

  // Null session, not a sign-out. Only meaningful once bootstrap has had its
  // chance to adopt the cookie.
  if (!bootstrapping) publish('signed-out');
});

async function bootstrap(): Promise<void> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) console.warn('[polvi-auth] getSession failed:', error.message);

    if (data?.session) {
      mirrorToCookie(data.session);
      publish('signed-in');
      return;
    }

    // No local session — see whether app.polvi.ai left one on the shared domain.
    const shared = readCrossDomainSession();
    if (!shared) {
      publish('signed-out');
      return;
    }

    const { data: adopted, error: setError } = await supabase.auth.setSession(shared);
    if (setError || !adopted?.session) {
      // Expired or revoked refresh token: drop the cookie so we stop retrying it
      // on every page load, here and on any other polvi.ai page.
      writeCrossDomainSession(null);
      publish('signed-out');
      if (setError) console.warn('[polvi-auth] shared session rejected:', setError.message);
      return;
    }

    mirrorToCookie(adopted.session);
    publish('signed-in');
  } catch (err) {
    // Network failure or a corrupt stored session. Clear the cookie for the same
    // reason as above and fall back to the signed-out view.
    writeCrossDomainSession(null);
    publish('signed-out');
    console.warn('[polvi-auth] session bootstrap failed:', describe(err));
  } finally {
    bootstrapping = false;
  }
}

const api = {
  get state(): PolviAuthState {
    return state;
  },
  get hasSession(): boolean {
    return state === 'signed-in';
  },
  appDashboardUrl: APP_DASHBOARD_URL,
  signInUrl: APP_SIGN_IN_URL,
  signUpUrl: APP_SIGN_UP_URL,
  changeEvent: CHANGE_EVENT,
  getSnapshot: snapshot,
  /** Calls the listener immediately with the current snapshot, then on changes. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(snapshot());
    return () => {
      listeners.delete(listener);
    };
  },
  supabase,
};

export type PolviAuthApi = typeof api;

/**
 * Module singleton. ES module evaluation happens exactly once, so two Supabase
 * clients can never end up fighting over the cookie and local-storage session.
 */
export const polviAuth = api;

/** Convenience for debugging from the console; components import `polviAuth`. */
window.__polviAuth = api;

void bootstrap();
