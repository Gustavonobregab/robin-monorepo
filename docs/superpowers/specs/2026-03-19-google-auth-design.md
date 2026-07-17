# Google Login Implementation — Design Spec

## Context

Robin has better-auth configured with Google OAuth provider, MongoDB adapter, and the auth handler mounted at `/api/auth/*`. The auth middleware is stubbed, dashboard sign-in/sign-up pages exist with email/password forms, and the dashboard middleware is a no-op. This spec connects the existing pieces and fixes config issues to create a working Google-only login flow.

### Decisions Made

- **Google only** — no email/password authentication
- **Single page** — `/sign-in` only, no separate sign-up (Google OAuth handles both)
- **Post-login redirect** — respects `callbackUrl` query param, defaults to `/dashboard`
- **No onboarding** — Google provides name, email, image

## 1. Fix Auth Config

`api/src/config/auth.ts` has `baseURL` hardcoded to port `3000`, but the API runs on port `3002`. This breaks the OAuth callback. Fix:

- Replace hardcoded `baseURL` and `clientURL` with environment variables
- `baseURL` → `process.env.BETTER_AUTH_URL || 'http://localhost:3002/api/auth'`
- `clientURL` → `process.env.CLIENT_URL || 'http://localhost:3333'`
- Update `trustedOrigins` to use the same env vars

**Google Console setup note:** The authorized redirect URI in Google Cloud Console must match the `baseURL` + `/callback/google` (e.g., `http://localhost:3002/api/auth/callback/google`).

## 2. API Auth Middleware

Replace the stub in `api/src/middlewares/auth.ts` with real session validation using better-auth's `auth.api.getSession()`.

The middleware receives the request, calls `auth.api.getSession({ headers: request.headers })`, and either:
- Sets `userId` from the session's `user.id` and continues
- Returns 401 if no valid session

`user.id` is the better-auth generated ID that maps to the MongoDB `_id` string of the user document. Downstream services already accept string IDs.

## 3. Sign-in Page

Rewrite `dashboard/app/(auth)/sign-in/page.tsx`:
- Remove email/password form entirely
- Single "Continue with Google" button
- Read `callbackUrl` from URL search params (set by middleware redirect)
- Call `signIn.social({ provider: 'google', callbackURL: callbackUrl || '/dashboard' })`
- Clean, centered layout consistent with the existing auth layout

## 4. Remove Sign-up Page

Delete `dashboard/app/(auth)/sign-up/` entirely. Google OAuth creates accounts automatically on first login — a separate sign-up page is unnecessary.

## 5. Dashboard Middleware

Implement `dashboard/middleware.ts` to protect `/dashboard/*` routes:
- Fetch session from `${process.env.NEXT_PUBLIC_API_URL}/api/auth/get-session` forwarding the request's `cookie` header
- Wrap in `try/catch` — on network error, fall through to sign-in redirect (prevents dashboard lockout if API is down)
- If valid session → `NextResponse.next()`
- If no session → redirect to `/sign-in?callbackUrl=${encodeURIComponent(pathname)}`
- Matcher excludes auth pages (`/sign-in`) and static assets

## 6. Files Affected

| File | Action |
|------|--------|
| `api/src/config/auth.ts` | Fix — use env vars for baseURL/clientURL, correct port |
| `api/src/middlewares/auth.ts` | Rewrite — real session validation via `auth.api.getSession()` |
| `dashboard/app/(auth)/sign-in/page.tsx` | Rewrite — Google-only button, respect callbackUrl |
| `dashboard/app/(auth)/sign-up/` | Delete directory |
| `dashboard/middleware.ts` | Implement — session check + redirect with error handling |

## 7. What This Does NOT Include

- Email/password authentication
- Sign-up page or onboarding flow
- Logout button (already exported as `signOut` from `auth-client.ts` — can be wired into dashboard UI separately)
- Role-based access control
- Organization/team support
- Session management UI (active sessions, logout from devices)
