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
- **Auth:** better-auth (mocked sign-in/sign-up forms for now)

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

Single-scroll marketing page. Max-width container, centered, large horizontal margins.

**Sections:**
1. **Navbar** — "Robin" wordmark (text only, Inter), nav links, Sign In + Get Started buttons
2. **Hero** — Large headline, short subheadline, single CTA button; bg `#FFFDF6`
3. **Features** — 3-column card grid: Text, Audio, Image; bg `#FAF6E9`; `rounded-xl`, `shadow-sm`
4. **How it works** — 3-step numbered flow (Upload → Process → Download); bg `#FFFDF6`
5. **Pricing** — 2–3 tier cards (Free, Pro, Enterprise); accented with `#DDEB9D`/`#A0C878`; mocked
6. **Footer** — "Robin" text, nav links, copyright; bg `#FAF6E9`

### Auth Pages (`/sign-in`, `/sign-up`)

Centered card layout on `#FFFDF6` background. Card is white, `rounded-xl`, `shadow-sm`. Form fields with shadcn/ui `Input` and `Button`. Mocked — no real auth integration for now.

---

## Dashboard Layout

Shared layout for all `/dashboard/*` routes. Consists of a collapsible sidebar and a topbar.

### Sidebar

- **Expanded state:** `w-56`, icons + labels
- **Collapsed state:** `w-14`, icons only with tooltips on hover
- Toggle button at the bottom of the sidebar
- State persisted in `localStorage`
- Smooth CSS width transition between states
- Active item: `#DDEB9D` background highlight

**Navigation groups** (separated by subtle dividers):

| Group | Items |
|---|---|
| Tools | Dashboard, Text, Audio, Image |
| Settings | API Keys, Billing |
| Account | Account |

### Topbar

- White background, `border-b`
- Page title on the left
- User avatar / dropdown menu on the right

### Main Content Area

- Background: `#FFFDF6`
- Padded, scrollable
- Adjusts width fluidly as sidebar collapses/expands

---

## Dashboard Pages

### Overview (`/dashboard`)

- **Stat cards (3):** Total jobs, characters processed, audio processed — sourced from the usage API
- **Recent jobs table:** columns — type, status, timestamp, download link — sourced from the jobs API
- **Quick action cards:** shortcut buttons to Text, Audio, Image tool pages

### Tool Pages (`/dashboard/text`, `/dashboard/audio`, `/dashboard/image`)

All three follow the same two-panel layout:

```
┌─────────────────────────────────────────┐
│  Page title + short description         │
├──────────────────────┬──────────────────┤
│  Input panel         │  Output panel    │
│  - Upload / paste    │  - Result        │
│  - Options           │  - Copy/Download │
└──────────────────────┴──────────────────┘
│  Process button (right-aligned)         │
└─────────────────────────────────────────┘
```

Panels: white bg, `rounded-xl`, `shadow-sm`.

- **Text:** textarea input, compression level selector, compressed text output + copy button
- **Audio:** drag-and-drop file upload, format/quality options, download compressed file
- **Image:** same layout as audio, image preview in output panel; process button disabled with a "Coming soon" badge — UI only, no API integration

### API Keys (`/dashboard/keys`)

- Table: name, key prefix, created date, last used date, revoke button
- "Create new key" button → inline form or simple modal (name field only)
- Revoke action requires confirmation

### Billing (`/dashboard/billing`) — mocked

- Current plan card with usage progress bar
- Upgrade CTA button
- Static UI only, no payment integration

### Account (`/dashboard/account`)

- Profile section: name and email (read-only, sourced from better-auth)
- Change password form: new password + confirm password fields
- Danger zone: delete account button (requires confirmation)

---

## API Integration

The frontend calls the existing `api/` backend. Key modules:

| Frontend page | Backend module |
|---|---|
| Text tool | `text` module |
| Audio tool | `audio` module |
| Image tool | mocked (no backend yet) |
| API Keys | `keys` module |
| Overview stats | `usage` module |
| Recent jobs | `jobs` module |
| Account | `users` module + better-auth |

---

## Out of Scope (for this spec)

- Real billing/payment integration
- Image compression backend
- Dark mode
- Mobile/responsive layout (can be addressed in a later iteration)
