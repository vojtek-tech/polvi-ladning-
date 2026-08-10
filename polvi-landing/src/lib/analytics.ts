/**
 * Landing page event tracking.
 *
 * Appends a row to public.landing_events (see supabase/landing_events.sql) for
 * each page view and each CTA click, so "which ref sent traffic, and did it
 * click" is answerable from the same database the signups land in.
 *
 * Nothing is stored on the visitor's device: no cookie, no localStorage, no
 * fingerprint. `VISIT_ID` lives in this module's scope for the life of the page
 * load and is gone on reload. That is a deliberate constraint, not an oversight —
 * it is what keeps this outside ePrivacy Art. 5(3) and so free of a consent
 * banner. Do not add persistence here without checking that decision first.
 *
 * Every function is fire-and-forget and swallows its own errors: tracking must
 * never break the page or delay a navigation.
 */

import { SUPABASE_URL } from './supabaseClient';

const ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ENDPOINT = `${SUPABASE_URL}/rest/v1/landing_events`;

/** Column widths in the table; trimmed here so a long URL can't fail the insert. */
const MAX_REF = 200;
const MAX_REFERRER = 500;
const MAX_PATH = 500;

/**
 * Identifies this page load only, so a view and the clicks that follow it can be
 * tied together. Held in memory — see the module comment.
 */
const VISIT_ID: string = makeVisitId();

function makeVisitId(): string {
  // randomUUID needs a secure context; http:// previews and older Safari fall back.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const hex = (n: number) => Math.floor(Math.random() * 16 ** n).toString(16).padStart(n, '0');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}

/**
 * Local development is excluded so it never shows up as traffic. Preview
 * deployments are not: they still report, and `host` is recorded on every row so
 * they can be filtered out at query time.
 */
function shouldTrack(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname } = window.location;
  return hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '[::1]';
}

function trim(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

/**
 * The campaign tag for this visit, in priority order: an explicit ?ref=, then the
 * usual UTM source, then the hostname that linked here. NULL is direct traffic.
 *
 * Only the hostname of the referrer is used as a ref — a full URL would make the
 * grouping useless, and paths from other sites are more identifying than we need.
 */
export function readRef(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const tagged = params.get('ref') ?? params.get('utm_source') ?? params.get('source');
  if (tagged) return trim(tagged, MAX_REF);

  const { referrer } = document;
  if (referrer) {
    try {
      const host = new URL(referrer).hostname;
      // A link from our own pages is not a referral.
      if (host && host !== window.location.hostname) return trim(host, MAX_REF);
    } catch {
      // Unparseable referrer — treat as direct.
    }
  }
  return null;
}

/**
 * Adds the current visit's ref to a URL as `?ref=`, so it survives the hop to
 * app.polvi.ai and can be recorded against the account created there.
 *
 * Deliberately a URL parameter and not a cookie: nothing is written to the
 * device, so this stays banner-free. The cost is that it only works when the
 * visitor clicks through in this page load — someone who returns later from a
 * bookmark arrives with no ref, and counts as direct.
 *
 * Returns the URL untouched when there is no ref, or when it cannot be parsed.
 */
export function appendRef(url: string): string {
  const ref = readRef();
  if (!ref) return url;
  try {
    const target = new URL(url);
    // An explicit ref already on the URL wins — don't overwrite a deliberate one.
    if (!target.searchParams.has('ref')) target.searchParams.set('ref', ref);
    return target.toString();
  } catch {
    return url;
  }
}

interface LandingEvent {
  visit_id: string;
  type: 'view' | 'cta_click';
  ref: string | null;
  cta: string | null;
  referrer: string | null;
  host: string | null;
  path: string | null;
}

function send(type: LandingEvent['type'], cta: string | null): void {
  if (!shouldTrack()) return;

  const body: LandingEvent = {
    visit_id: VISIT_ID,
    type,
    cta,
    ref: readRef(),
    referrer: trim(document.referrer, MAX_REFERRER),
    host: window.location.hostname,
    path: trim(window.location.pathname, MAX_PATH),
  };

  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        // Don't ask PostgREST to send the inserted row back: the anon role has no
        // SELECT policy, so requesting it would turn a good insert into a failure.
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
      // The CTAs navigate to app.polvi.ai on click. Without keepalive the browser
      // cancels this request as the page goes away and the click is never counted.
      keepalive: true,
    }).catch(() => {
      // Offline, blocked by an extension, RLS refusal — all non-events for the page.
    });
  } catch {
    // fetch itself unavailable. Nothing to do, and nothing worth breaking over.
  }
}

/** One per page load. */
export function trackView(): void {
  send('view', null);
}

/**
 * One per CTA click. `cta` is the label that shows up in landing_cta_stats —
 * keep it short and stable ('hero', 'nav', 'pricing:pro').
 */
export function trackCtaClick(cta: string): void {
  send('cta_click', cta);
}
