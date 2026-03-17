# Robin Frontend Design Spec

**Date:** 2026-03-17
**Status:** Approved

---

## Overview

Build the frontend for the Robin platform — a SaaS tool for compressing text, audio, and images. The frontend lives in the `dashboard/` workspace of the existing monorepo and connects to the Elysia/Bun API in `api/`.

---

## Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Font:** Inter
- **Data fetching:** TanStack Query (React Query) for all client-side API calls in the dashboard
- **Auth:** better-auth — middleware protects `/dashboard/*` routes server-side; sign-in/sign-up pages submit to better-auth endpoints; forms can use placeholder credentials during development

---

## Environment

```
NEXT_PUBLIC_API_URL=http://localhost:3002
```

All API calls use this base URL. The `dashboard/` workspace reads it at build time via `process.env.NEXT_PUBLIC_API_URL`.

---

## Design System

| Token | Value |
|---|---|
| Background (primary) | `#FFFDF6` |
| Background (section) | `#FAF6E9` |
| Accent light | `#DDEB9D` |
| Accent strong | `#A0C878` |
| Text (headings) | `#111111` |
| Text (body) | `#444444` |
| Border radius (cards) | `rounded-xl` |
| Border radius (buttons) | `rounded-full` |
| Shadow | `shadow-sm` |
| Container | `max-w-6xl`, centered, `px-8`–`px-12` |

- Light mode only
- Minimal and clean — no heavy gradients or decorative noise
- Soft shadows, rounded components throughout
- Black text, color accents limited to `#DDEB9D` / `#A0C878`

### Loading States

- Dashboard pages that fetch data show skeleton placeholders (`rounded-xl` animated pulse) while TanStack Query loads
- Submit/process buttons show a spinner icon and are disabled during in-flight requests
- Tool output panels show a "processing…" skeleton while the job is being polled

### Error States

- API errors surface as toast notifications (shadcn/ui `Sonner`) — brief, dismissible, non-blocking
- Form validation errors appear inline below the relevant field
- If a page-level data fetch fails, show a simple inline error message with a "Retry" button — no full-page error states

### Empty States

- **Recent jobs table (Overview):** "No jobs yet. Try processing some text or audio." with quick-action links
- **API Keys table:** "No API keys yet." with a "Create your first key" button

---

## Route Structure

```
dashboard/
└── app/
    ├── (marketing)/
    │   ├── layout.tsx            # Navbar + footer
    │   └── page.tsx              # Landing page
    │
    ├── (auth)/
    │   ├── layout.tsx            # Centered card layout
    │   ├── sign-in/page.tsx
    │   └── sign-up/page.tsx
    │
    └── (dashboard)/
        ├── layout.tsx            # Sidebar + topbar shell
        └── dashboard/
            ├── page.tsx          # Overview
            ├── text/page.tsx
            ├── audio/page.tsx
            ├── image/page.tsx
            ├── keys/page.tsx
            ├── billing/page.tsx
            └── account/page.tsx
```

---

## Pages

### Landing Page (`/`)

Single-scroll marketing page. Max-width container (`max-w-6xl`), centered, `px-8`–`px-12` horizontal padding.

**Sections:**
1. **Navbar** — "Robin" wordmark (Inter, text only), nav links, Sign In + Get Started buttons
2. **Hero** — Large headline, short subheadline, single CTA button; bg `#FFFDF6`
3. **Features** — 3-column card grid: Text, Audio, Image; bg `#FAF6E9`; `rounded-xl`, `shadow-sm`
4. **How it works** — 3-step numbered flow (Upload → Process → Download); bg `#FFFDF6`
5. **Pricing** — 2–3 tier cards (Free, Pro, Enterprise); accented with `#DDEB9D`/`#A0C878`; mocked static UI
6. **Footer** — "Robin" text, nav links, copyright; bg `#FAF6E9`

### Auth Pages

**Sign in (`/sign-in`):** email + password fields → `POST /api/auth/sign-in/email` → on success redirect to `/dashboard`

**Sign up (`/sign-up`):** name + email + password fields → `POST /api/auth/sign-up/email` → on success redirect to `/dashboard` directly (no email verification required)

Both: centered card layout on `#FFFDF6` background, white card, `rounded-xl`, `shadow-sm`, shadcn/ui `Input` and `Button`.

---

## Dashboard Layout

Shared layout for all `/dashboard/*` routes.

### Topbar Page Titles

| Route | Title |
|---|---|
| `/dashboard` | Dashboard |
| `/dashboard/text` | Text |
| `/dashboard/audio` | Audio |
| `/dashboard/image` | Image |
| `/dashboard/keys` | API Keys |
| `/dashboard/billing` | Billing |
| `/dashboard/account` | Account |

### Sidebar

- **Expanded state:** `w-56`, icons + labels
- **Collapsed state:** `w-14`, icons only with shadcn/ui `Tooltip` on hover
- Toggle button at the bottom of the sidebar
- State persisted in `localStorage`
- Smooth CSS width transition between states
- Active item: `#DDEB9D` background highlight

**Navigation groups** (separated by subtle `border-t` dividers):

| Group | Items |
|---|---|
| Tools | Dashboard, Text, Audio, Image |
| Settings | API Keys, Billing |
| Account | Account |

### Topbar

- White background, `border-b`
- Page title (from table above) on the left
- User avatar / dropdown menu on the right

### Main Content Area

- Background: `#FFFDF6`
- Padded (`p-6` or `p-8`), scrollable
- Adjusts width fluidly as sidebar collapses/expands via CSS transition

### Responsive / Viewport

Desktop-only. Minimum supported viewport width: `1024px`. No mobile or tablet layout.

---

## API Response Shapes

### Job object

Returned by `POST /text`, `POST /audio`, and `GET /<type>/jobs/:id`:

```ts
{
  _id: string
  userId: string
  status: 'created' | 'pending' | 'processing' | 'completed' | 'failed'
  payload: {
    type: 'audio' | 'text'
    operations: object[]
    preset?: string
  }
  result?: {
    outputUrl: string      // URL to the processed file/text
    metrics?: object
  }
  error?: string
  completedAt?: string
  createdAt: string
}
```

### Usage analytics (`GET /usage/analytics`)

```ts
{
  data: {
    stats: { totalRequests: number, tokensSaved: number, tokensUsed: number }
    recent: Array<{
      id: string, type: string, status: string,
      size: string, latency: string, timestamp: string
    }>
    chart: Array<{ date: string, requests: number }>
    breakdown: Array<{ type: string, count: number, percentage: number }>
  }
}
```

### Current usage (`GET /usage/current`)

```ts
{ data: { tokensLimit: number, tokensUsed: number, tokensRemaining: number } }
```

### API Keys (`GET /keys`)

```ts
{
  data: Array<{
    _id: string, name: string, key: string,
    status: 'active' | 'revoked',
    createdAt: string, lastUsedAt?: string
  }>
}
```

### API Key Authentication

All dashboard API calls (tools, jobs, keys, usage) require an `X-API-Key: <key>` header. The frontend stores the user's selected API key in `localStorage` (key: `robin_api_key`). On dashboard load, if no key is stored, a top-of-page banner prompts the user: "You need an API key to use Robin tools. [Create one →]" linking to `/dashboard/keys`. Tool pages' Process buttons are disabled until a key is set.

### Next.js Middleware

A `middleware.ts` file at the root of `dashboard/` protects `/dashboard/*` routes. It reads the better-auth session cookie; if absent or invalid, it redirects to `/sign-in`. Public routes (`/`, `/sign-in`, `/sign-up`) are excluded from the check.

Sign-in and sign-up calls use better-auth's built-in endpoints (`POST /api/auth/sign-in/email`, `POST /api/auth/sign-up/email`). The session cookie is managed by better-auth automatically.

---

## Job Polling Strategy

Tool submissions are **asynchronous**. `POST /text` and `POST /audio` return a job with `status: 'created'`. The frontend must poll until completion:

1. Submit job → get `job._id`; store in component state
2. Enable a TanStack Query poll query for `GET /<type>/jobs/:id` (set `enabled: !!jobId`, `refetchInterval: 2000`)
3. Stop polling when `status === 'completed'` or `status === 'failed'` by setting `refetchInterval` to `false` in the query's `select` or via the `enabled` flag
4. On `completed`: display `result.metrics` in the output panel (see per-tool output below)
5. On `failed`: show toast with `error` message; show inline error in output panel
6. On timeout (5 min / 150 polls): set a counter; when reached, disable polling and show "This is taking longer than expected. Try again."

**⚠️ Note:** The `result.outputUrl` field is not yet implemented in the backend worker (marked as TODO). The current API only returns `result.metrics` on job completion. Tool output panels display metrics only until storage upload is wired up.

**TanStack Query defaults (apply globally in `QueryClient` config):**
- `refetchOnWindowFocus: false`
- `staleTime: 30_000` (30 seconds) for list queries (keys, usage)
- `retry: 1` for mutations; `retry: 2` for queries

---

## Dashboard Pages

### Overview (`/dashboard`)

Fetches from `GET /usage/analytics?range=30d` via TanStack Query.

- **Stat cards (3):** Total Requests (`stats.totalRequests`), Tokens Saved (`stats.tokensSaved`), Tokens Used (`stats.tokensUsed`)
- **Activity chart:** Line chart of `chart` array (`{ date, requests }`) using Recharts (included with shadcn); shows last 30 days of request volume; simple, no axes labels except date
- **Recent activity table:** from `recent` array — columns: Type, Status, Size, Latency, Timestamp; max 5 rows; skeleton while loading; empty state if array is empty
- **Quick action cards (3):** shortcut buttons to Text, Audio, Image pages

### Tool Pages

The API accepts a **remote URL** (not direct file upload). Each tool page has this two-panel layout:

```
┌─────────────────────────────────────────┐
│  Page title + short description         │
├──────────────────────┬──────────────────┤
│  Input panel         │  Output panel    │
│  - URL input field   │  - Result /      │
│  - Preset selector   │    download link │
└──────────────────────┴──────────────────┘
  [Process button — right-aligned]
```

Panels: white bg, `rounded-xl`, `shadow-sm`.

---

#### Text Page (`/dashboard/text`)

**Input panel:**
- URL field — paste a link to a text file
- Preset selector (radio cards): **Chill** / **Medium** / **Aggressive**

**Output panel:**
- While polling: skeleton / "Processing…" state
- On complete: compressed text displayed in a read-only textarea; Copy button; character count before/after
- On failed: inline error message

**Output panel on complete:** Shows compression metrics from `result.metrics`:
- Compression ratio (e.g. "2.4× smaller")
- Input size → Output size (e.g. "12.4 KB → 5.1 KB")
- Operations applied (e.g. "trim → shorten")

Note: `result.outputUrl` (the compressed text content) is not yet available from the API. Until the backend implements file storage, the output panel shows metrics only.

**API:** `POST /text` with `{ textUrl, preset: 'chill' | 'medium' | 'aggressive' }` → poll `GET /text/jobs/:id`

---

#### Audio Page (`/dashboard/audio`)

**Input panel:**
- URL field — paste a link to an audio file
- Preset selector (radio cards): **Chill** / **Medium** / **Aggressive** / **Podcast** / **Lecture**

**Output panel on complete:** Shows compression metrics from `result.metrics`:
- Compression ratio (e.g. "1.8× smaller")
- Input size → Output size (e.g. "4.2 MB → 2.3 MB")
- Operations applied (e.g. "trim-silence → normalize → compress")

Note: `result.outputUrl` (the processed audio file) is not yet available from the API. Until the backend implements file storage, the output panel shows metrics only — no download link.

**API:** `POST /audio` with `{ audioUrl, preset: 'chill' | 'medium' | 'aggressive' | 'podcast' | 'lecture' }` → poll `GET /audio/jobs/:id`

---

#### Image Page (`/dashboard/image`) — visual stub only

Same two-panel layout. URL input + static preset selector (not wired to any API). Process button is **disabled** with a "Coming soon" badge. Output panel shows a static placeholder. **No job submission, no polling, no API calls.**

---

### API Keys (`/dashboard/keys`)

Fetches from `GET /keys` via TanStack Query.

**Create key:** `POST /keys` with `{ name: string }` → returns `{ data: { _id, name, key, status, createdAt } }`. The full key value is only returned on creation — show it in a one-time modal with a copy button.

**Revoke key:** `DELETE /keys/:id` → returns `{ data: { revoked: true } }`.

- Table columns: Name, Key (frontend-masked: first 12 chars + `...`, e.g. `sk_live_a1b2…`), Created, Last Used, Revoke button
- "Create new key" → opens shadcn/ui `Dialog` modal with a Name field (`minLength: 1, maxLength: 50`); on submit calls `POST /keys`
- Revoke → opens shadcn/ui `AlertDialog` confirmation; on confirm calls `DELETE /keys/:id`
- Toast on create/revoke success or error
- Empty state if no keys exist
- Skeleton while loading

### Billing (`/dashboard/billing`) — mocked static UI

- Current plan card showing "Free" plan
- Usage progress bar — static mock: 4,200 / 10,000 tokens used (42%)
- Upgrade CTA button (no action)

### Account (`/dashboard/account`)

Session is fetched client-side via better-auth's `useSession()` hook (React context provided in the dashboard layout). The user's name and email are also shown in the topbar avatar dropdown using this same session.

- **Profile section:** Name and Email fields — read-only display, sourced from `session.user`
- **Change password form:** New Password + Confirm Password fields (client-side match validation); submit calls better-auth's `changePassword` client method with `{ newPassword, revokeOtherSessions: false }`; shows inline validation and toast on success/error
- **Danger zone:** Delete account button — opens an `AlertDialog` but takes no action (disabled in this iteration); button has a "coming soon" visual treatment

---

## Out of Scope

- Real billing/payment integration
- Image compression backend and API
- Dark mode
- Mobile/tablet responsive layout (min supported width: 1024px)
- Advanced operation customization (per-operation parameter sliders) — presets only for now
- Direct file upload (API requires remote URLs)
