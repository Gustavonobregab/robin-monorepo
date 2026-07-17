# Robin — UI rebuild (ElevenLabs-inspired, black & white)

Design system copied from the ElevenLabs app (measured from the live DOM).
Colors will be re-themed later — build everything on tokens, never hex.

## Non-negotiables

- Fonts: **Geist only** (`font-sans`, already global). NEVER `font-mono`, never uppercase-tracking micro labels.
- Tokens only: `background, foreground, card, popover, secondary, muted, muted-foreground, accent, border, input, ring, destructive(-subtle/-foreground)`. Alpha blacks allowed: `black/10` (borders), `black/[0.02..0.06]` (fills/hovers).
- Red (`destructive`) ONLY for destructive actions/errors. Everything else monochrome.
- Follow `dashboard/CLAUDE.md`: http layer wrapping, error funnel (`toastApiError` / `parseApiError` from `app/http/errors.ts`), `Skeleton` for loading (shaped like content, never full-page spinner), `Loader2` spinner only inline in buttons, render `null` for missing values (no `—`/`N/A` placeholders in fields — table ratio cells may show `—`), TypeScript strict.

## Measured ElevenLabs values (already encoded in the shared components)

- Primary button: near-black `bg-primary`, radius 10px, h-36px, text 14/500, no shadow.
- Secondary/chips/inputs: border **1.5px** `black/10`, radius 12px, h-40px, hover `black/[0.04]`.
- Cards/list rows: **transparent** until hover → `black/[0.04]`, radius 16px (rows) / 20px (cards), padding 8px.
- Composer (dropzone): outer white card radius 24 + hairline border, inner well radius 16 `black/[0.02]`.
- Segmented pill: grey track `black/[0.05]` r10, active = white pill shadow-sm r8, 13/500.
- Inline settings (composer bottom bar): h-32px r10 px-8 hover-grey, 13/500, icon 16px.
- Popovers/menus: white, r12, hairline border, `shadow-lg`, items r8 hover `black/[0.05]`.
- Underline tabs: muted labels, active ink + 2px underline sitting on a hairline.

## Shared components — import, don't recreate (`@/app/components/ui/*`)

- `Button.tsx` — `variant: primary | secondary | ghost | destructive`, `size: sm|md|lg|icon`, `asChild`.
- `Card.tsx` — white surface r20 hairline (grouping panels).
- `Chip.tsx` — filter chip, `active` prop.
- `SearchInput.tsx` — search field w/ glyph.
- `Tabs.tsx` — underline tabs (`tabs: string[]`, `defaultValue`, `onChange`).
- `Select.tsx` — `Select` (form) + `InlineSelect` (composer settings bar, icon + value).
- `DropdownMenu.tsx` — `DropdownMenu/Trigger/Content/Item(destructive?)/Separator`.
- `SegmentedControl.tsx` — `options/value/onChange`.
- `Slider.tsx` — `value/onChange/min/max/step`.
- `Switch.tsx` — Radix switch.
- `Dropzone.tsx` — `onFiles/accept/label/hint/multiple` + children (settings bar under the well).
- `Modal.tsx` — generic dialog shell (`trigger/title/description/children`), `ModalClose`.
- `ConfirmDialog.tsx` — yes/no ask (`tone: primary|destructive`, `trigger/title/description/confirmLabel/onConfirm`).
- `Field.tsx` — `Field` (label+hint wrapper), `Input`, `Textarea`.
- `Skeleton.tsx`, `EmptyState.tsx` (`icon/title/hint/action`), `StatusBadge.tsx` (`status: done|processing|queued|failed`), `Progress.tsx`, `PageHeader.tsx` (`title/description/actions`).

Page-specific pieces live INSIDE the page file. Do NOT edit shared components,
`globals.css`, `tailwind.config.ts`, or `app/(app)/layout.tsx` (except the
assistant task, which owns the layout edit).

## Data wiring

The v1 pages (with all fetching/handlers) are preserved at git HEAD:
`git show 'HEAD:dashboard/app/(app)/dashboard/<page>/page.tsx'`
Reuse that logic (SWR keys, `app/http/*` functions, `app/hooks/*`, `types/index.ts`,
job polling via `use-job-poll`, upload via `http/upload.ts`) and re-skin with the
shared components. If v1 logic conflicts with the new layout, keep the logic,
change the presentation. SWR load error → inline card with "Try again" button
calling `mutate()` (never a toast).

## Page recipes (ElevenLabs reference → our case)

Every tool page (text/audio/image) follows the **voice-isolator** recipe:
title → composer (Dropzone or Textarea in the r24 card, settings bar of
InlineSelects along the bottom, circular near-black submit button on the right
`rounded-full h-10 w-10` with `ArrowUp`) → history strip below (SearchInput +
rows r16 grey-hover with StatusBadge, size, ratio, time, row actions via
DropdownMenu: download / delete-with-ConfirmDialog).

Everything else (history/usage/billing/keys/settings) follows the
**voice-library / image-video history** recipe: PageHeader → underline Tabs
when there are views → SearchInput + Chips row for filters → list/table rows
r16 grey-hover, or Card panels for stats/forms.

## Verification

Run `cd dashboard && bunx tsc --noEmit` — must pass clean. Do not run the dev
server (it's already running on :3333).
