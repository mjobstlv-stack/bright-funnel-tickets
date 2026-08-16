# bright-funnel-tickets

Ticketing-only product, extracted from `bright-funnel-lab` (Event OS): event
creation/management for organizers + public ticket purchase/checkout for
buyers. All other modules (table reservations, inventory, POS, staff
scheduling/attendance, general finance) are intentionally left out.

**Status:** design complete, code extraction not started yet. See:

- [`docs/superpowers/specs/2026-08-13-ticketing-extraction-design.md`](docs/superpowers/specs/2026-08-13-ticketing-extraction-design.md) —
  what gets copied from the source app, what gets dropped, and the required
  code edits (Ops tab removal, booking-mode removal, sidebar trim).
- [`docs/superpowers/specs/2026-08-13-qa-testing-team-design.md`](docs/superpowers/specs/2026-08-13-qa-testing-team-design.md) —
  planned QA agent/skill toolkit + test pass, to run once this app is up.

## Source

Extracted from [`bright-funnel-lab`](https://github.com/reutgohar-collab/bright-funnel-lab),
a TanStack Start + React 19 + Supabase app. This is a one-time file
extraction, not a fork or git subtree — no ongoing link to the source repo.

## Backend

Shares the same Supabase project as the source app (same auth users, same
data). Not yet split into an isolated database.

## Known product facts carried over from the source app

- Checkout payment is currently a **hardcoded mock** (no real PayPlus call).
- No email/SMS is actually sent for ticket delivery yet, despite UI copy
  implying it.

## ⚠ Known security issue (pre-existing, carried over from the source app — not fixed during extraction)

**Cross-tenant authorization gap in org-scoped endpoints.** Several places
that should resolve "the current user's organization" instead resolve "the
oldest organization in the whole database" (`from("organizations").order("created_at",
{ ascending: true }).limit(1)`), with no check that the calling user is
actually a member of that org. Found in `src/lib/payments.functions.ts`
(`getPayplusStatus`, `savePayplusCredentials`) and the same pattern appears
in `src/routes/_authenticated/dashboard.tsx`. Practical impact: **any
authenticated user can view and overwrite the first organization's PayPlus
payment credentials**, and dashboards may show the wrong org's data, once
more than one organization exists in the database.

This is a real bug in the source app, not something introduced by this
extraction — flagged here rather than fixed, since fixing it means
threading proper `org_members`-based org resolution through every server
function that currently uses this shortcut, which is a bigger change than a
file extraction. Needs a decision + fix before this app is used with more
than one organization in the database.

`src/lib/admin.functions.ts` `createSupportTicket` similarly accepts a
client-supplied `orgId` without verifying membership — lower severity
(ticket metadata spoofing only, not data exposure), same root cause.
