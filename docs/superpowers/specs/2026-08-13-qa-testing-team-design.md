# QA Testing Team — Design Spec

Date: 2026-08-13
Status: Approved (pending final user sign-off on this file)

## Goal

Add a persistent QA agent/skill toolkit to this project, then run an intensive,
field-by-field test pass against the live app at
`https://bright-funnel-lab.lovable.app`, logged in as the user's own account,
and deliver one consolidated test report (what works, what doesn't, severity).

Note: this spec was originally written against the source monolith
(`bright-funnel-lab`). It is carried over here and will be re-scoped to this
ticketing-only app once the extraction (see the companion extraction spec)
is complete.

## Target environment

- **App under test:** `https://bright-funnel-lab.lovable.app` (Lovable-hosted
  deployment), not localhost.
- **Backend:** Supabase project `dmgjxvurkfjpuoegszcs`. Confirmed by the user
  to be a development/demo database — safe to create/modify/delete test data.
- **Login:** `mjobstlv@gmail.com`. Password supplied by the user is used only
  as a local environment variable at test-run time (`E2E_PASSWORD`), never
  written to a committed file, never printed in the report.

## Confirmed safety facts (from source review)

- **Payments (PayPlus):** confirmed mock/sandbox in code —
  `src/routes/_authenticated/settings.tsx` states the integration is "coming
  soon" and "mock checkout stays active." No live credentials exist in this
  repo. Checkout flows are safe to exercise.
- **Google Calendar / Meet:** `src/lib/gcal.server.ts` and
  `src/lib/meet.functions.ts` require `LOVABLE_API_KEY` +
  `GOOGLE_CALENDAR_API_KEY` server env vars. These are not available to us, so
  any flow touching this will fail closed with a "not connected" error
  instead of creating a real calendar event. This is an expected/acceptable
  test outcome, not a bug, unless the error is unhandled/ugly in the UI.
- **Email:** Supabase Auth sends real transactional email (invites, password
  reset). We will only trigger these against the user's own address, never
  against arbitrary third-party addresses.

## Approach

Chosen approach: **Playwright automation + static/RLS security review +
agent-driven analysis**, run in module-sized phases rather than one giant
pass.

Rejected alternatives:

- _Pure static/code-review QA_ (no live run) — faster but doesn't satisfy the
  user's explicit ask to actually exercise the live app with real login.
- _One-shot exhaustive run across all modules_ — the app has ~20+
  authenticated routes plus public booking pages; attempting full
  field-level coverage in a single pass is unrealistic to deliver reliably
  in one sitting. Phasing lets us validate the process and report format
  early.

No browser MCP/live-browser tool is available in this session. Playwright is
installed as a project dev dependency and driven headlessly via Bash
(`npx playwright test`), pointed at the deployed URL. It captures
screenshots per screen/state, which are then visually reviewed (via Read) for
UI/UX assessment — this substitutes for interactive browsing.

## Persistent additions to the project

Under `.claude/` in this repo (committed to git so they're reusable in future
sessions):

- `agents/qa-manager.md` — owns the test plan/checklist across modules,
  aggregates all other agents' findings into the final report.
- `agents/ui-ux-tester.md` — reviews Playwright screenshots for visual
  consistency, RTL/Hebrew layout correctness, accessibility, responsiveness.
- `agents/security-pentester.md` — reviews RLS policies in
  `supabase/migrations/*.sql` against actual behavior; attempts
  unauthenticated/cross-org access via direct REST calls to Supabase to
  verify RLS actually blocks it (IDOR-style checks); reviews public
  token-based routes.
- `agents/bug-hunter.md` — edge cases: empty/very long/special-character
  field input, console errors, failed network requests, broken states.
- `agents/manual-tester.md` — scripted manual-style checklist per
  screen/form, covering judgment calls automation misses (copy quality,
  Hebrew phrasing, UX friction).
- `agents/automation-tester.md` — writes and runs the Playwright suite,
  produces pass/fail evidence + screenshots per test.
- `skills/qa-audit/SKILL.md` — describes how to invoke this team together
  and where the report goes.

## Test scope & phasing

Will be re-scoped to only the modules that exist in this ticketing-only app
(Auth, Events, Checkout/Orders, Team, Reviews/ticket-requests, Settings,
System admin) once extraction is done.

## Report

- `docs/qa/report-<date>.md` in the repo: one table per module, one row per
  field/scenario, columns = Status (PASS/FAIL/BLOCKED), Severity, Notes/repro
  steps. Updated/appended each phase.
- Mirrored as a published Artifact for easy sharing after each phase.

## Out of scope for this pass

- Load/performance testing.
- Testing third-party integrations that require credentials we don't have
  (live PayPlus, live Google Calendar).
- Mobile native apps (this is a web app only).
