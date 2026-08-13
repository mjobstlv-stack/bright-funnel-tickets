# Ticketing Module Extraction — Design Spec

Date: 2026-08-13
Status: Approved (pending final user sign-off on this file)

## Goal

Extract the ticketing product (organizer creates/manages events, buyers
purchase tickets) out of `bright-funnel-lab` into this new, standalone
repo/project, dropping every other module (table reservations, inventory,
POS, staff scheduling/attendance, general finance). The QA-testing-team work
(see companion spec) is paused and will resume against this new, smaller app
once extraction is done.

## Source

Source app: `bright-funnel-lab`
(`https://github.com/reutgohar-collab/bright-funnel-lab.git`, cloned locally
at `C:\Users\Moshe\bright-funnel-lab`). This repo does not depend on that
one; it's a one-time extraction, not a fork/subtree.

## New project

- **Local path:** `C:\Users\Moshe\bright-funnel-tickets`
- **GitHub repo:** `bright-funnel-tickets`, private, under the `mjobstlv-stack`
  account.
- **Backend:** same Supabase project (`dmgjxvurkfjpuoegszcs`) as the source
  app — no new database, no migrations to write. Both apps will share auth
  users and data. (Trade-off accepted by the user: simplicity now over data
  isolation; a fresh Supabase project can be split off later if needed.)

## Scope decisions (confirmed with user)

| Feature | Decision |
|---|---|
| Event "Ops" tab (inventory / staff availability / time clock / venue layout) | **Removed entirely** |
| Public sale mode: "booking" (table reservation as alternative to tickets) | **Removed entirely** — tickets-only |
| Event "Budget" tab (self-contained per-event expense tracker) | **Kept** |
| Platform "System admin" console (cross-org admin panel) | **Kept** |

## File scope

Based on a full import-trace of the source repo. Copy to the new project:

**Routes — organizer:** `__root.tsx`, `_authenticated/route.tsx` (sidebar
trimmed, see below), `_authenticated/dashboard.tsx`,
`_authenticated/events.index.tsx`, `_authenticated/events.$id.tsx` (Ops tab
removed, see below), `_authenticated/events.new.tsx`,
`_authenticated/onboarding.tsx`, `_authenticated/settings.tsx`,
`_authenticated/team.tsx`, `_authenticated/reviews.tsx` (ticket-request
approval queue — not a ratings module), `_authenticated/admin.tsx` (system
admin console).

**Routes — buyer:** `e.$slug.tsx`, `e.$slug.index.tsx` (booking branch
removed), `e.$slug.checkout.tsx`, `order.$orderNumber.tsx`.

**Routes — auth/landing:** `auth.tsx`, `reset-password.tsx`, `index.tsx`,
`en.tsx`, `terms.tsx`, `en.terms.tsx`.

**Dropped routes:** `attendance.tsx`, `finance.tsx`, `inventory.*`,
`reservations.*`, `staff.*`, `avail.$token.tsx`, `inv.$token.tsx`,
`r.$slug.tsx`, `res.$token.tsx`.

**Components:** all of `components/event/*` (all used); all of
`components/checkout/*` except `EventBookingCard.tsx` (booking-only,
dropped); all of `components/ui/*` (generic, bring whole folder); all of
`components/landing/*` (copy will need a rewrite pass later to stop
advertising reservations/inventory/staff features — not a blocker);
`app-sidebar.tsx` (trimmed nav — see below).

**Dropped components:** `InventorySection.tsx`, `AvailabilitySection.tsx`,
`TimeClockSection.tsx`, `VenueLayoutSection.tsx`, `PosIntegrationSection.tsx`,
`PosReconciliationSection.tsx`, `MenuImportSection.tsx`,
`components/reservations/**`, `components/inventory/**`.

**`src/lib/*` kept:** `events.functions.ts`, `orders.functions.ts`,
`payments.functions.ts`, `requests.functions.ts`, `ai-content.functions.ts`,
`ai-page.functions.ts`, `meet.functions.ts`, `team.server.ts`,
`team.functions.ts`, `admin.functions.ts`, `admin.server.ts`, `auth.tsx`,
`i18n.tsx`, `utils.ts`, `error-capture.ts`, `error-page.ts`,
`lovable-error-reporting.ts`.

**`src/lib/*` dropped:** `gcal.server.ts` (only consumed by the scheduling
module, which is dropped — `meet.functions.ts` does not depend on it),
`menu.functions.ts`, `meta.functions.ts` (dead code, unused anywhere today),
`inventory.functions.ts`, `inventory.server.ts`, `reservations.functions.ts`,
`reservations.server.ts`, `scheduling.functions.ts`, `scheduling.server.ts`,
`pos.functions.ts`, `pos.server.ts`.

**`src/integrations/*`:** copied as-is (`supabase/client.ts`,
`client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `types.ts`).
`integrations/lovable/index.ts` copied but verified at build time — no
ticketing code imports it directly.

**Code edits required (not just copy):**
1. `events.$id.tsx` — delete the Ops tab import + JSX block (Inventory/
   Availability/TimeClock/VenueLayout). Keep Budget tab as-is.
2. `e.$slug.index.tsx` — delete the `sale_mode === "booking"` branch and the
   `EventBookingCard` import/usage; ticket picker becomes the only path.
3. `app-sidebar.tsx` — trim nav to Home/Dashboard, Events, Team, Reviews,
   Settings, System admin (conditional on `amIPlatformAdmin()`). Remove
   Staff, Inventory & purchasing, Restaurant/Reservations, Finance groups.
4. `package.json` — add missing explicit dependency `@radix-ui/react-direction`
   (currently only works via hoisting in the source repo — a real bug
   waiting to happen once the tree changes shape). Keep `xlsx` (genuinely
   used by `events.$id.tsx` schedule import, not inventory-related despite
   the name). Verify whether `recharts`/`chart.tsx` is used by the admin
   console before dropping it — if unused, drop; if used, keep.

## Known limitations to carry over (not bugs to "fix" during extraction)

- Checkout payment is a **hardcoded mock** — `orders.functions.ts`
  `finalizeMockOrder` just flips status to `paid`; there is no real PayPlus
  call even though the UI mentions PayPlus.
- No email/SMS actually gets sent for ticket delivery despite copy implying
  it ("a copy is on its way to your email").

These are pre-existing product truths, not extraction bugs — worth noting
back to the user once the extracted app is running, but out of scope to fix
now.

## Steps (high level — detailed in the implementation plan)

1. ~~`git init` new local repo, scaffold config files~~ — done.
2. Copy the file set above from `bright-funnel-lab`, apply the four code
   edits.
3. Copy `.env` (same Supabase project/keys) — not committed.
4. `npm install`, `npm run build` and `npm run lint`/typecheck until clean.
5. Smoke test locally: sign up/log in, create an event, view its public
   page, complete mock checkout, view order confirmation, open system admin
   console.
6. ~~`gh repo create bright-funnel-tickets --private`, push~~ — done
   (docs-only so far; code extraction still pending).

## Out of scope

- Rewriting landing page marketing copy (cosmetic, still mentions dropped
  modules) — flagged, not blocking.
- Any new Supabase project / data isolation from the source app.
- Resuming the QA-testing-team work — happens after this, in a later round,
  scoped to this repo.
