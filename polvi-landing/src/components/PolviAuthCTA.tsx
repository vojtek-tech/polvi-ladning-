import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { polviAuth, type PolviAuthSnapshot } from '../authBridge';
import { appendRef, trackCtaClick } from '../lib/analytics';

/** Subscribes to the auth bridge and re-renders when the session state settles. */
export function usePolviAuth(): PolviAuthSnapshot {
  const [snapshot, setSnapshot] = useState<PolviAuthSnapshot>(() => polviAuth.getSnapshot());
  useEffect(() => polviAuth.subscribe(setSnapshot), []);
  return snapshot;
}

interface PolviAuthCTAProps {
  className?: string;
  /** Label shown to a visitor without a session. */
  label?: string;
  arrowClassName?: string;
  /**
   * Which CTA this is, for the event log: 'nav', 'hero', 'closing'. Omit to leave
   * the click untracked.
   */
  trackingId?: string;
}

/**
 * The header call to action.
 *
 * Signed in → "Go to app", pointing at the dashboard. Signed out → the normal
 * sign-up CTA. While the session is still resolving it renders the same markup
 * with visibility:hidden, which holds the layout and avoids a flash of the
 * signed-out state on a load that is about to resolve to signed-in.
 */
export function PolviAuthCTA({
  className = '',
  label = 'Try Polvi',
  // Inherits the button's colour by default — an explicitly gold arrow would be
  // invisible against the filled gold .btn-cta.
  arrowClassName = 'arrow',
  trackingId,
}: PolviAuthCTAProps) {
  const { state, hasSession, appDashboardUrl, signUpUrl } = usePolviAuth();

  // The icon is decorative — the adjacent text carries the meaning. It is sized in
  // em by .btn-cta/.btn-nav so it tracks the button's font-size.
  const arrow = <ArrowRight className={arrowClassName} aria-hidden="true" />;

  if (state === 'loading') {
    return (
      <span className={className} style={{ visibility: 'hidden' }} aria-hidden="true">
        <span>{label}</span>
        {arrow}
      </span>
    );
  }

  return (
    <a
      // Only the sign-up link carries the ref: a visitor with a session already has
      // an account, so there is nothing left to attribute.
      href={hasSession ? appDashboardUrl : appendRef(signUpUrl)}
      className={className}
      // Fires alongside the navigation rather than before it: the request is sent
      // with keepalive, so it survives the page going away and needs no delay here.
      onClick={trackingId ? () => trackCtaClick(trackingId) : undefined}
    >
      <span>{hasSession ? 'Go to app' : label}</span>
      {arrow}
    </a>
  );
}
