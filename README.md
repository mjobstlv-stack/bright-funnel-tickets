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
