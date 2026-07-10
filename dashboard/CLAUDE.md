# Robin Wood — Dashboard (Frontend)

## Stack

Next.js 15+ (App Router), TypeScript, Tailwind CSS, ky, SWR, better-auth, Radix UI, Framer Motion, Sonner

## Running

```bash
bun run dev    # from repo root: bun run dev:dashboard
bun run build
bun run lint
```

## File Naming

- **PascalCase** for components (`Button.tsx`, `CreateKeyModal.tsx`)
- **kebab-case** for directories (`(auth)/`, `(public)/`)
- **camelCase** for hooks, utils, and http modules (`use-profile.ts`, `keys.ts`)

## Source Layout

```
app/
├── (auth)/        # Authenticated routes
├── (public)/      # Public routes
├── components/    # Shared UI components
├── hooks/         # React hooks
├── http/          # API functions (one file per domain)
│   ├── api.ts     # ky client instances
│   ├── audio.ts
│   ├── keys.ts
│   └── ...
├── layout.tsx
└── page.tsx
types/
└── index.ts       # All shared TypeScript types
```

## HTTP Layer

Two ky instances in `app/http/api.ts`:

- `api` — unauthenticated requests
- `clientApi` — authenticated requests (sends cookies, sets `Content-Type: application/json`)

**Never call `clientApi`/`api` directly in components.** Always wrap in a typed function inside `app/http/<module>.ts`:

```ts
// app/http/keys.ts
import { clientApi } from './api';
import type { KeysListResponse } from '@/types';

export const getApiKeys = async (): Promise<KeysListResponse> => {
  return clientApi.get('keys').json();
};

export const deleteApiKey = async (id: string): Promise<void> => {
  await clientApi.delete(`keys/${id}`).json();
};
```

Then consume with SWR in hooks or directly in Server Components.

## Types

All shared types live in `types/index.ts`. API responses use the `ApiResponse<T>` wrapper:

```ts
type KeysListResponse = ApiResponse<{ keys: ApiKey[] }>;
```

## Error handling

Never show the backend's raw error message to users. The API returns
`{ success: false, error: { code, message } }`; translate the `code` through
the single map in `app/http/errors.ts`.

- **Action failed** (submit, create, save, revoke) → `toastApiError(err, fallback)`.
- **Special-cased codes** (e.g. `INSUFFICIENT_CREDITS` links to billing) → use
  `parseApiError` + check the code at the call site. Only for codes where the UI
  actually reacts differently; everything else goes through `toastApiError`.
- **Load failed** (SWR `error`) → inline card with a "Try again" button that
  calls `mutate()`. Not a toast.
- New backend code → add one line to `ERROR_MESSAGES`. Never `switch (code)` in a
  component; the map is the single source.

## Colors

Use theme tokens only — never hardcode hex or Tailwind palette classes
(`bg-red-500`, `text-amber-800`) in app UI.

- **Neutrals / brand** → `background`, `background-section`, `accent-light`,
  `accent-strong`, `foreground`, `muted`, `border`.
- **Semantic status** → `danger` / `danger-light`, `warning` / `warning-light`;
  success reuses `accent-light`. Defined once in `tailwind.config.ts`.
- Hardcoded hex is allowed only when a color is genuinely data-driven, or in
  marketing/landing illustrations (fake browser chrome, decorative gradients).

## Loading states

One component, one rule — use `Skeleton` from `@/app/components/ui/skeleton`,
never hand-roll `animate-pulse`.

- **Content loading** (page, panel, table, list) → `Skeleton`, shaped like the
  real content. Never a full-page/centered spinner.
- **Spinner** (`Loader2` spinning) → only for inline action states, e.g. a
  button mid-submit or a row mid-download.

## Empty / missing values

Never render `—`, `N/A`, `Not linked`, or any placeholder string for missing
data. Render nothing (`null`). Empty beats noisy.
