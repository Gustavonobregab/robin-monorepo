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
