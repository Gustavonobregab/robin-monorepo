# Google Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Google-only login using better-auth with session-based route protection on both API and dashboard.

**Architecture:** better-auth handles OAuth flow and session management via MongoDB adapter. API middleware validates sessions via `auth.api.getSession()`. Dashboard Next.js middleware checks sessions by calling the API's get-session endpoint with forwarded cookies.

**Tech Stack:** better-auth, Elysia, Next.js 15 (App Router), MongoDB (Mongoose)

**Spec:** `docs/superpowers/specs/2026-03-19-google-auth-design.md`

---

### Task 1: Fix Auth Config — Use Env Vars

**Files:**
- Modify: `api/src/config/auth.ts`
- Modify: `api/.env` (fix `BETTER_AUTH_URL` value)
- Modify: `api/.env.example` (add `CLIENT_URL`)
- Modify: `.env.example` (add `CLIENT_URL`)

**Context:** `auth.ts` hardcodes `baseURL` to port `3000` but the API runs on port `3002`. The `.env` file also has `BETTER_AUTH_URL="http://localhost:3000"` which is wrong. `clientURL` is hardcoded to `http://localhost:3333`. Both need env vars. `trustedOrigins` must also use the env vars.

- [ ] **Step 1: Fix `api/src/config/auth.ts`**

Replace hardcoded URLs with env vars:

```typescript
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

const baseURL = process.env.BETTER_AUTH_URL || 'http://localhost:3002';
const clientURL = process.env.CLIENT_URL || 'http://localhost:3333';

export const auth = betterAuth({
  database: mongodbAdapter(mongoose.connection.db as any),
  baseURL,
  clientURL,
  trustedOrigins: [clientURL],
  socialProviders: {
    google: {
      clientId: googleId as string,
      clientSecret: googleSecret as string,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  user: {
    modelName: "users",
  }
});
```

Key changes:
- `baseURL` → from `BETTER_AUTH_URL` env var (default `http://localhost:3002`). This is the server origin only — better-auth's default `basePath` (`/api/auth`) handles the route prefix.
- `clientURL` → from `CLIENT_URL` env var (default `http://localhost:3333`). Passed to `betterAuth()` so it knows where to redirect after OAuth.
- `trustedOrigins` → uses `clientURL` variable instead of hardcoded list
- Removed `http://localhost:3000` from trustedOrigins (wrong port)
- Removed explicit `basePath` — better-auth defaults to `/api/auth` which matches our mount point in `server.ts`

- [ ] **Step 2: Fix `api/.env`**

Change `BETTER_AUTH_URL` from `http://localhost:3000` to `http://localhost:3002` (origin only — better-auth appends the basePath). Add `CLIENT_URL`:

```
BETTER_AUTH_URL="http://localhost:3002"
```

Add after BETTER_AUTH_SECRET:
```
CLIENT_URL="http://localhost:3333"
```

- [ ] **Step 3: Update `.env.example` files**

Add `CLIENT_URL=` to both `api/.env.example` and root `.env.example`.

- [ ] **Step 4: Commit**

```bash
git add api/src/config/auth.ts api/.env api/.env.example .env.example
git commit -m "fix(auth): use env vars for better-auth baseURL and clientURL"
```

---

### Task 2: API Auth Middleware — Real Session Validation

**Files:**
- Modify: `api/src/middlewares/auth.ts`

**Context:** The current middleware is a stub that returns `userId: 'stub-user-id'` for all requests. Replace with real session validation using `auth.api.getSession()`. The middleware receives the raw request, calls getSession with the request headers, and either sets `userId` from the session or returns 401.

- [ ] **Step 1: Rewrite `api/src/middlewares/auth.ts`**

```typescript
import { Elysia } from 'elysia';
import { auth } from '../config/auth';
import { ApiError } from '../utils/api-error';

export const validateAuth = new Elysia({ name: 'validate-auth' })
  .derive({ as: 'scoped' }, async ({ request }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      throw new ApiError('UNAUTHORIZED', 'Unauthorized', 401);
    }

    return {
      userId: session.user.id,
    };
  });
```

Key points:
- `auth.api.getSession({ headers: request.headers })` — forwards cookies from the request
- `session.user.id` is the better-auth generated ID that maps to the MongoDB `_id` string
- Uses `ApiError` (from `api/src/utils/api-error.ts`) for consistency with the rest of the codebase — returns `{ success: false, error: { code, message } }` via the global error handler

- [ ] **Step 2: Commit**

```bash
git add api/src/middlewares/auth.ts
git commit -m "feat(auth): replace stub middleware with real session validation"
```

---

### Task 3: Sign-in Page — Google-Only Button

**Files:**
- Modify: `dashboard/app/(auth)/sign-in/page.tsx`

**Context:** Replace the email/password form with a single "Continue with Google" button. The page reads `callbackUrl` from search params (set by the dashboard middleware redirect) and passes it to `signIn.social()`. The auth layout (`dashboard/app/(auth)/layout.tsx`) provides the centered container with Robin branding.

Available from `auth-client.ts`: `signIn`, `signUp`, `signOut`, `useSession`.
`signIn.social({ provider: 'google', callbackURL })` triggers the Google OAuth flow.

- [ ] **Step 1: Rewrite `dashboard/app/(auth)/sign-in/page.tsx`**

```tsx
'use client'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { signIn } from '@/app/lib/auth-client'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
  const [loading, setLoading] = useState(false)

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      await signIn.social({
        provider: 'google',
        callbackURL: callbackUrl,
      })
    } catch {
      toast.error('Could not sign in with Google. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-background rounded-xl shadow-sm border border-border p-8">
      <h1 className="text-xl font-semibold mb-1">Sign in</h1>
      <p className="text-sm text-muted mb-6">Welcome back.</p>
      <Button
        onClick={handleGoogleSignIn}
        className="w-full rounded-full bg-accent-strong text-foreground hover:bg-accent-light"
        disabled={loading}
      >
        {loading ? 'Redirecting…' : 'Continue with Google'}
      </Button>
    </div>
  )
}
```

Key changes:
- Removed email/password form, `useRouter`, `Link`, `Input`, `Label` imports
- Single button calls `signIn.social({ provider: 'google', callbackURL })`
- `callbackURL` comes from search params (middleware sets this)
- No `setLoading(false)` in success path — page redirects to Google
- Removed "No account? Sign up" link

- [ ] **Step 2: Commit**

```bash
git add dashboard/app/\(auth\)/sign-in/page.tsx
git commit -m "feat(auth): rewrite sign-in page with Google-only button"
```

---

### Task 4: Delete Sign-up Page

**Files:**
- Delete: `dashboard/app/(auth)/sign-up/page.tsx`

**Context:** Google OAuth handles account creation automatically on first login. A separate sign-up page is unnecessary. The `signUp` export from `auth-client.ts` stays (no harm; it's just an export).

- [ ] **Step 1: Delete the sign-up directory**

```bash
rm -rf dashboard/app/\(auth\)/sign-up
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/app/\(auth\)/sign-up/page.tsx
git commit -m "feat(auth): remove sign-up page, Google OAuth handles registration"
```

---

### Task 5: Dashboard Middleware — Session Protection

**Files:**
- Modify: `dashboard/middleware.ts`

**Context:** Protect `/dashboard/*` routes by checking the session via the API. The middleware fetches `${NEXT_PUBLIC_API_URL}/api/auth/get-session` forwarding the request's `cookie` header. If there's a valid session, proceed. If not, redirect to `/sign-in?callbackUrl=<original-path>`. Wrap in try/catch so that if the API is down, the user gets redirected to sign-in instead of seeing an error.

Important: `NEXT_PUBLIC_API_URL` is set to `http://localhost:3002` in `dashboard/.env.local`. The get-session endpoint is at `/api/auth/get-session` (better-auth built-in).

- [ ] **Step 1: Implement `dashboard/middleware.ts`**

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/get-session`,
      {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      },
    )

    if (res.ok) {
      const session = await res.json()
      if (session?.user) {
        return NextResponse.next()
      }
    }
  } catch {
    // API unreachable — redirect to sign-in
  }

  const signInUrl = new URL('/sign-in', request.url)
  signInUrl.searchParams.set('callbackUrl', pathname)
  return NextResponse.redirect(signInUrl)
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

Key points:
- Forwards `cookie` header from the incoming request so better-auth can validate the session
- Checks `res.ok` AND `session?.user` — both must be truthy
- On network error (API down), falls through to redirect (no dashboard lockout crash)
- `callbackUrl` preserves the original path so the user returns after login
- Matcher only runs on `/dashboard/*` — auth pages and static assets are excluded

- [ ] **Step 2: Commit**

```bash
git add dashboard/middleware.ts
git commit -m "feat(auth): implement dashboard middleware with session protection"
```
