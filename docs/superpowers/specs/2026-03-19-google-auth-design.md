# Google Login Implementation — Design Spec

## Context

Robin Wood already has better-auth configured with Google OAuth provider, MongoDB adapter, and the auth handler mounted at `/api/auth/*`. The auth middleware is stubbed, dashboard sign-in/sign-up pages exist with email/password forms, and the dashboard middleware is a no-op. This spec connects the existing pieces to create a working Google-only login flow.

### Decisions Made

- **Google only** — no email/password authentication
- **Single page** — `/sign-in` only, no separate sign-up (Google OAuth handles both)
- **Post-login redirect** — straight to `/dashboard`
- **No onboarding** — Google provides name, email, image

## 1. API Auth Middleware

Replace the stub in `api/src/middlewares/auth.ts` with real session validation using better-auth's `auth.api.getSession()`.

The middleware receives the request, calls `auth.api.getSession({ headers: request.headers })`, and either:
- Sets `userId` from the session's `user.id` and continues
- Returns 401 if no valid session

This is the only API-side change needed. The auth config, handler, and Google provider are already set up correctly.

## 2. Sign-in Page

Rewrite `dashboard/app/(auth)/sign-in/page.tsx`:
- Remove email/password form entirely
- Single "Continue with Google" button
- Calls `signIn.social({ provider: 'google', callbackURL: '/dashboard' })`
- Clean, centered layout consistent with the existing auth layout

## 3. Remove Sign-up Page

Delete `dashboard/app/(auth)/sign-up/` entirely. Google OAuth creates accounts automatically on first login — a separate sign-up page is unnecessary and would confuse users.

## 4. Dashboard Middleware

Implement `dashboard/middleware.ts` to protect `/dashboard/*` routes:
- Fetch session from `${API_URL}/api/auth/get-session` forwarding the request cookies
- If valid session → `NextResponse.next()`
- If no session → redirect to `/sign-in?callbackUrl=${encodeURIComponent(pathname)}`
- Auth pages (`/sign-in`) are excluded from protection via the matcher

## 5. Files Affected

| File | Action |
|------|--------|
| `api/src/middlewares/auth.ts` | Rewrite — real session validation via `auth.api.getSession()` |
| `dashboard/app/(auth)/sign-in/page.tsx` | Rewrite — Google-only button |
| `dashboard/app/(auth)/sign-up/page.tsx` | Delete |
| `dashboard/middleware.ts` | Implement — session check + redirect |

## 6. What This Does NOT Include

- Email/password authentication
- Sign-up page or onboarding flow
- Role-based access control
- Organization/team support
- Session management UI (active sessions, logout from devices)
