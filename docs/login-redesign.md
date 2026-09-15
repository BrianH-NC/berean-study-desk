# Login redesign

The supplied mockup and implementation brief are implemented on feature/login-redesign.

Changed Auth.jsx and added Auth.css. The original Auth.jsx is preserved as LegacyAuth.jsx (unimported and excluded from the production bundle) because it contains unverified email/password sign-in and sign-up code. Google is the only method displayed.

The existing Supabase singleton, Google provider, origin-based redirect, select-account prompt, App session listener, protected routes, logout, and post-login routing are unchanged. The button now guards duplicate clicks, indicates loading, and recovers from returned or thrown errors with accessible, nontechnical feedback.

Desktop uses a 55/45 split. Below 1000px the image becomes a shallow background and the card is prioritized. Existing optimized study-lake.webp and the approved mark.svg are reused; no new photographic asset or dependencies. The current global theme is light-only, so no independent appearance toggle is introduced. Privacy/Terms/Help links are omitted because no routes exist.

Validation: build and lint pass (existing warnings), 51 existing tests pass. An isolated browser fixture verified disabled/loading state, failure recovery, and inline feedback without initiating a real login. Layout measured at 390x844, 768x1024, 1024x768, 1366x768, and 1920x1080: no horizontal or vertical overflow and Google CTA above the fold. A full Google sign-in round trip still needs user verification on the preview; no user was logged out for testing.
