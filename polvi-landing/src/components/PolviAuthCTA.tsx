import { useEffect, useState } from 'react';
import { polviAuth, type PolviAuthSnapshot } from '../authBridge';

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
  arrowClassName = 'arrow gold',
}: PolviAuthCTAProps) {
  const { state, hasSession, appDashboardUrl, signUpUrl } = usePolviAuth();

  if (state === 'loading') {
    return (
      <span className={className} style={{ visibility: 'hidden' }} aria-hidden="true">
        <span>{label}</span> <span className={arrowClassName}>→</span>
      </span>
    );
  }

  return (
    <a href={hasSession ? appDashboardUrl : signUpUrl} className={className}>
      <span>{hasSession ? 'Go to app' : label}</span> <span className={arrowClassName}>→</span>
    </a>
  );
}
