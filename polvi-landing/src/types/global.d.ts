import type { PolviAuthApi } from '../authBridge';

declare global {
  interface Window {
    /**
     * Published by the auth bridge before the React app runs. Components must
     * treat it as possibly absent (if the bridge failed to load) and fall back to
     * the signed-out view.
     */
    __polviAuth?: PolviAuthApi;
  }
}
