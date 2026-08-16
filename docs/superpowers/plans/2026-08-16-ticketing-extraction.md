# Ticketing Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the empty `bright-funnel-tickets` repo (currently docs-only) into a working, standalone ticketing app — extracted from `C:\Users\Moshe\bright-funnel-lab` — that builds, type-checks, and serves the organizer (event creation/management) and buyer (public checkout) flows against the same Supabase backend.

**Architecture:** Same stack as the source app (TanStack Start + React 19 + Vite + Supabase), same file layout conventions (`src/routes` file-based routing, `src/components`, `src/lib`, `src/integrations`). This is a **file extraction + surgical trim**, not a rewrite: files are copied verbatim wherever possible; three files get targeted edits to remove cross-module coupling (event Ops tab, table-booking sale mode, inventory stat on the dashboard); the sidebar nav is rewritten to drop links to modules that no longer exist.

**Tech Stack:** TanStack Start, TanStack Router (file-based, auto-generates `routeTree.gen.ts` — never hand-edit or hand-copy that file), TanStack Query, React 19, Supabase JS client, Tailwind v4, shadcn/ui (Radix primitives), Zod, React Hook Form.

## Global Constraints

- Source of truth for all copied files: `C:\Users\Moshe\bright-funnel-lab` (do not modify the source repo in this plan).
- Target repo: `C:\Users\Moshe\bright-funnel-tickets` (already `git init`'d, pushed once to `https://github.com/mjobstlv-stack/bright-funnel-tickets`, **public**).
- Backend: same Supabase project `dmgjxvurkfjpuoegszcs` — copy `.env` values, never commit `.env` (add it to `.gitignore`; the source repo's `.gitignore` does **not** exclude `.env`, which is a mistake — do not repeat it here, especially since this repo is public).
- Package manager: `npm` (the source repo also has `bun.lock`, but we'll use `npm install`/`package-lock.json` for the new repo — simpler, no bun-specific config needed since we're not adding any 24h-supply-chain-guard-bypassed packages).
- Do not fix the pre-existing mock-payment / no-email-delivery behavior — out of scope (see spec).
- Every task ends with a real command run and its actual expected output — no "should work," run it and look.

---

### Task 1: Scaffold project config files

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `bunfig.toml`, `.gitignore`, `components.json`

**Interfaces:**
- Produces: an `npm install`-able project skeleton that later tasks add `src/` into.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "bright-funnel-tickets",
  "private": true,
  "sideEffects": false,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@lovable.dev/cloud-auth-js": "^1.1.2",
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-aspect-ratio": "^1.1.8",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.16",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-direction": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-hover-card": "^1.1.15",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-menubar": "^1.1.16",
    "@radix-ui/react-navigation-menu": "^1.2.14",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-progress": "^1.1.8",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slider": "^1.3.6",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-toggle": "^1.1.10",
    "@radix-ui/react-toggle-group": "^1.1.11",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@supabase/supabase-js": "^2.108.2",
    "@tailwindcss/vite": "^4.2.1",
    "@tanstack/react-query": "^5.101.1",
    "@tanstack/react-router": "^1.170.16",
    "@tanstack/react-start": "^1.168.26",
    "@tanstack/router-plugin": "^1.168.18",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.1.0",
    "embla-carousel-react": "^8.6.0",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.575.0",
    "react": "^19.2.0",
    "react-day-picker": "^9.14.0",
    "react-dom": "^19.2.0",
    "react-hook-form": "^7.71.2",
    "react-resizable-panels": "^4.6.5",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.5.0",
    "tailwindcss": "^4.2.1",
    "tw-animate-css": "^1.3.4",
    "vaul": "^1.1.2",
    "vite-tsconfig-paths": "^6.0.2",
    "xlsx": "^0.18.5",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@eslint/js": "^9.32.0",
    "@lovable.dev/vite-tanstack-config": "2.12.0",
    "@types/node": "^22.16.5",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^5.2.0",
    "eslint": "^9.32.0",
    "eslint-config-prettier": "^10.1.1",
    "eslint-plugin-prettier": "^5.2.6",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^15.15.0",
    "nitro": "3.0.260603-beta",
    "prettier": "^3.7.3",
    "typescript": "^5.8.3",
    "typescript-eslint": "^8.56.1",
    "vite": "^8.0.16"
  }
}
```

Note vs. source: added `@radix-ui/react-direction` explicitly (it's imported by `src/lib/i18n.tsx` but was only ever present in the source project via hoisting from other Radix packages — an accident waiting to break). Removed `recharts` (confirmed unused by any file we're copying — only `components/ui/chart.tsx` imports it, and nothing imports `chart.tsx`).

- [ ] **Step 2: Copy the remaining config files verbatim**

```bash
cd /c/Users/Moshe/bright-funnel-tickets
SRC=/c/Users/Moshe/bright-funnel-lab
cp "$SRC/vite.config.ts" .
cp "$SRC/tsconfig.json" .
cp "$SRC/eslint.config.js" .
cp "$SRC/.prettierrc" .
cp "$SRC/.prettierignore" .
cp "$SRC/bunfig.toml" .
cp "$SRC/components.json" .
```

- [ ] **Step 3: Write `.gitignore`** (same as source, plus `.env` which the source repo forgot to exclude)

```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
.output
.vinxi
.tanstack/**
.nitro
*.local

# Env
.env

# Wrangler / Cloudflare
.wrangler/
.dev.vars

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```

- [ ] **Step 4: Verify the files exist**

Run: `ls package.json vite.config.ts tsconfig.json eslint.config.js .prettierrc .prettierignore bunfig.toml components.json .gitignore`
Expected: all 9 filenames printed, no "No such file" errors.

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.ts tsconfig.json eslint.config.js .prettierrc .prettierignore bunfig.toml components.json .gitignore
git commit -m "Scaffold project config"
```

---

### Task 2: Copy shared infrastructure (integrations, lib, hooks, assets, styles)

**Files:**
- Create: `src/integrations/**`, `src/lib/*` (kept subset), `src/hooks/use-mobile.tsx`, `src/assets/**`, `src/styles.css`

**Interfaces:**
- Consumes: nothing (leaf infrastructure layer).
- Produces: `@/integrations/supabase/client`, `@/integrations/supabase/client.server`, `@/integrations/supabase/auth-middleware` (`requireSupabaseAuth`), `@/integrations/supabase/auth-attacher` (`attachSupabaseAuth`), `@/integrations/supabase/types`, `@/lib/auth` (`useAuth`, `AuthProvider`), `@/lib/i18n` (`useLang`, `LanguageProvider`), `@/lib/utils` (`cn`), `@/lib/events.functions`, `@/lib/orders.functions`, `@/lib/payments.functions`, `@/lib/requests.functions`, `@/lib/ai-content.functions`, `@/lib/ai-page.functions`, `@/lib/meet.functions`, `@/lib/team.functions`, `@/lib/team.server`, `@/lib/admin.functions`, `@/lib/admin.server`, `@/lib/error-capture`, `@/lib/error-page`, `@/lib/lovable-error-reporting` — all consumed by Task 4/5 route files.

- [ ] **Step 1: Copy integrations**

```bash
cd /c/Users/Moshe/bright-funnel-tickets
SRC=/c/Users/Moshe/bright-funnel-lab
mkdir -p src/integrations/supabase src/integrations/lovable
cp "$SRC/src/integrations/supabase/"*.ts src/integrations/supabase/
cp "$SRC/src/integrations/lovable/index.ts" src/integrations/lovable/
```

- [ ] **Step 2: Copy the kept `lib/*` files**

```bash
cd /c/Users/Moshe/bright-funnel-tickets
SRC=/c/Users/Moshe/bright-funnel-lab
mkdir -p src/lib
for f in events.functions.ts orders.functions.ts payments.functions.ts \
         requests.functions.ts ai-content.functions.ts ai-page.functions.ts \
         meet.functions.ts team.server.ts team.functions.ts \
         admin.functions.ts admin.server.ts auth.tsx i18n.tsx utils.ts \
         error-capture.ts error-page.ts lovable-error-reporting.ts; do
  cp "$SRC/src/lib/$f" src/lib/
done
```

- [ ] **Step 3: Copy hooks, assets, styles**

```bash
cd /c/Users/Moshe/bright-funnel-tickets
SRC=/c/Users/Moshe/bright-funnel-lab
mkdir -p src/hooks src/assets
cp "$SRC/src/hooks/use-mobile.tsx" src/hooks/
cp "$SRC/src/assets/"* src/assets/
cp "$SRC/src/styles.css" src/
```

- [ ] **Step 4: Verify file counts match expectations**

Run: `ls src/lib | wc -l`
Expected: `17`

Run: `ls src/integrations/supabase | wc -l`
Expected: `5`

- [ ] **Step 5: Commit**

```bash
git add src/integrations src/lib src/hooks src/assets src/styles.css
git commit -m "Copy shared infra: integrations, lib, hooks, assets, styles"
```

---

### Task 3: Copy UI primitives and feature components

**Files:**
- Create: `src/components/ui/**` (all except `chart.tsx`), `src/components/event/**` (all except `EventOpsTab.tsx`), `src/components/checkout/CheckoutDialog.tsx`, `src/components/checkout/RequestDialog.tsx`, `src/components/landing/**`

**Interfaces:**
- Consumes: `@/lib/utils` (`cn`) from Task 2.
- Produces: `@/components/ui/*` (shadcn primitives), `@/components/event/*`, `@/components/checkout/CheckoutDialog`, `@/components/checkout/RequestDialog`, `@/components/landing/Landing`, `@/components/landing/TermsPage` — consumed by Task 4/5 routes.

- [ ] **Step 1: Copy `components/ui` minus `chart.tsx`**

```bash
cd /c/Users/Moshe/bright-funnel-tickets
SRC=/c/Users/Moshe/bright-funnel-lab
mkdir -p src/components/ui
cp "$SRC/src/components/ui/"*.tsx src/components/ui/
rm src/components/ui/chart.tsx
```

- [ ] **Step 2: Copy `components/event` minus `EventOpsTab.tsx`**

```bash
cd /c/Users/Moshe/bright-funnel-tickets
SRC=/c/Users/Moshe/bright-funnel-lab
mkdir -p src/components/event
cp "$SRC/src/components/event/"* src/components/event/
rm src/components/event/EventOpsTab.tsx
```

- [ ] **Step 3: Copy the two kept checkout components (not `EventBookingCard.tsx`)**

```bash
cd /c/Users/Moshe/bright-funnel-tickets
SRC=/c/Users/Moshe/bright-funnel-lab
mkdir -p src/components/checkout
cp "$SRC/src/components/checkout/CheckoutDialog.tsx" src/components/checkout/
cp "$SRC/src/components/checkout/RequestDialog.tsx" src/components/checkout/
```

- [ ] **Step 4: Copy `components/landing`**

```bash
cd /c/Users/Moshe/bright-funnel-tickets
SRC=/c/Users/Moshe/bright-funnel-lab
mkdir -p src/components/landing
cp "$SRC/src/components/landing/"* src/components/landing/
```

- [ ] **Step 5: Verify**

Run: `ls src/components/ui | wc -l`
Expected: `45`

Run: `ls src/components/event`
Expected: 12 files, `EventOpsTab.tsx` NOT in the list.

Run: `ls src/components/checkout`
Expected: `CheckoutDialog.tsx` and `RequestDialog.tsx` only — `EventBookingCard.tsx` NOT present.

- [ ] **Step 6: Commit**

```bash
git add src/components
git commit -m "Copy UI primitives, event, checkout, and landing components"
```

---

### Task 4: Write the trimmed sidebar

**Files:**
- Create: `src/components/app-sidebar.tsx`

**Interfaces:**
- Consumes: `@/lib/i18n` (`useLang`), `@/lib/admin.functions` (`amIPlatformAdmin`), `@/components/ui/sidebar` (from Task 3).
- Produces: `AppSidebar` component, consumed by `_authenticated/route.tsx` in Task 5.

- [ ] **Step 1: Write the file** (same as source, with Staff / Inventory & purchasing / Restaurant / Finance nav groups removed — those routes no longer exist in this app)

```tsx
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Calendar,
  CalendarDays,
  Home,
  ShieldAlert,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import logoAsset from "@/assets/eventos-logo.svg.asset.json";
import { useLang } from "@/lib/i18n";
import { amIPlatformAdmin } from "@/lib/admin.functions";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean; children?: Array<{ to: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean }> };

export function AppSidebar() {
  const { t, dir } = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    amIPlatformAdmin()
      .then((r) => setIsPlatformAdmin(r.isPlatformAdmin))
      .catch(() => setIsPlatformAdmin(false));
  }, []);

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const groups: Array<{ label: string; items: Item[] }> = [
    {
      label: t("בית", "Home"),
      items: [
        { to: "/dashboard", label: t("לוח בקרה", "Dashboard"), icon: Home, exact: true },
        { to: "/team", label: t("צוות והרשאות", "Team & permissions"), icon: UserCog },
      ],
    },
    {
      label: t("אירועים", "Events"),
      items: [
        {
          to: "/events",
          label: t("כל האירועים", "All events"),
          icon: Calendar,
          children: [{ to: "/events/new", label: t("אירוע חדש", "New event"), icon: CalendarDays, exact: true }],
        },
        { to: "/reviews", label: t("אישורי כניסה", "Entry approvals"), icon: ShieldCheck },
      ],
    },
  ];

  if (isPlatformAdmin) {
    groups.push({
      label: t("ניהול מערכת", "System admin"),
      items: [{ to: "/admin", label: t("לקוחות ותשלומים", "Customers & billing"), icon: ShieldAlert }],
    });
  }

  return (
    <Sidebar collapsible="icon" side={dir === "rtl" ? "right" : "left"}>
      <SidebarHeader className="px-3 py-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="Event OS" className="h-6 w-auto" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive(item.to, item.exact)} tooltip={item.label}>
                      <Link to={item.to}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.children && (
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.to}>
                            <SidebarMenuSubButton asChild isActive={isActive(child.to, child.exact)}>
                              <Link to={child.to}>
                                <child.icon className="h-3.5 w-3.5" />
                                <span>{child.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
```

- [ ] **Step 2: Verify no leftover references to dropped icons/routes**

Run: `grep -nE "Boxes|Truck|PackageCheck|Plug|LayoutGrid|CreditCard|UtensilsCrossed|Users|Wallet" src/components/app-sidebar.tsx`
Expected: no output (empty match — those lucide icons were only used by the dropped nav groups).

- [ ] **Step 3: Commit**

```bash
git add src/components/app-sidebar.tsx
git commit -m "Write trimmed sidebar nav (drop staff/inventory/reservations/finance)"
```

---

### Task 5: Copy routes, then apply the three coupling edits

**Files:**
- Create: `src/__root.tsx`, `src/router.tsx`, `src/server.ts`, `src/start.ts`, `src/routes/_authenticated/route.tsx`, `src/routes/_authenticated/events.index.tsx`, `src/routes/_authenticated/events.new.tsx`, `src/routes/_authenticated/onboarding.tsx`, `src/routes/_authenticated/settings.tsx`, `src/routes/_authenticated/team.tsx`, `src/routes/_authenticated/reviews.tsx`, `src/routes/_authenticated/admin.tsx`, `src/routes/e.$slug.tsx`, `src/routes/e.$slug.checkout.tsx`, `src/routes/order.$orderNumber.tsx`, `src/routes/auth.tsx`, `src/routes/reset-password.tsx`, `src/routes/index.tsx`, `src/routes/en.tsx`, `src/routes/terms.tsx`, `src/routes/en.terms.tsx`
- Modify (copy then edit): `src/routes/_authenticated/dashboard.tsx`, `src/routes/_authenticated/events.$id.tsx`, `src/routes/e.$slug.index.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2–4 (`@/integrations/supabase/*`, `@/lib/*`, `@/components/*`).
- Produces: the full route tree — TanStack Router's Vite plugin (already wired in `vite.config.ts` via `@lovable.dev/vite-tanstack-config`) auto-generates `src/routeTree.gen.ts` from these files the first time `npm run dev` or `npm run build` runs. **Do not hand-write or copy `routeTree.gen.ts` from the source repo** — it encodes the source app's full (larger) route set and will not match this app's routes.

- [ ] **Step 1: Copy root-level src files and the routes that need no edits**

```bash
cd /c/Users/Moshe/bright-funnel-tickets
SRC=/c/Users/Moshe/bright-funnel-lab
cp "$SRC/src/__root.tsx" src/
cp "$SRC/src/router.tsx" src/
cp "$SRC/src/server.ts" src/
cp "$SRC/src/start.ts" src/

mkdir -p src/routes/_authenticated
for f in route.tsx events.index.tsx events.new.tsx onboarding.tsx \
         settings.tsx team.tsx reviews.tsx admin.tsx; do
  cp "$SRC/src/routes/_authenticated/$f" src/routes/_authenticated/
done

for f in e.\$slug.tsx e.\$slug.checkout.tsx order.\$orderNumber.tsx \
         auth.tsx reset-password.tsx index.tsx en.tsx terms.tsx en.terms.tsx; do
  cp "$SRC/src/routes/$f" src/routes/
done
```

- [ ] **Step 2: Copy the three files that need edits, as a starting point**

```bash
cd /c/Users/Moshe/bright-funnel-tickets
SRC=/c/Users/Moshe/bright-funnel-lab
cp "$SRC/src/routes/_authenticated/dashboard.tsx" src/routes/_authenticated/
cp "$SRC/src/routes/_authenticated/events.\$id.tsx" src/routes/_authenticated/
cp "$SRC/src/routes/e.\$slug.index.tsx" src/routes/
```

- [ ] **Step 3: Edit `src/routes/_authenticated/events.$id.tsx`** — remove the Ops tab

Remove the import (currently line 15):
```tsx
import { EventOpsTab } from "@/components/event/EventOpsTab";
```

Change the `TabsList` from:
```tsx
          <TabsTrigger value="orders">{t("הזמנות", "Orders")} ({orders.length})</TabsTrigger>
          <TabsTrigger value="ops">{t("תפעול", "Operations")}</TabsTrigger>
          <TabsTrigger value="budget">{t("תקציב", "Budget")}</TabsTrigger>
```
to:
```tsx
          <TabsTrigger value="orders">{t("הזמנות", "Orders")} ({orders.length})</TabsTrigger>
          <TabsTrigger value="budget">{t("תקציב", "Budget")}</TabsTrigger>
```

Remove the `ops` `TabsContent` block entirely:
```tsx
        <TabsContent value="ops" className="mt-6">
          <EventOpsTab eventId={ev.id} currency={ev.currency} />
        </TabsContent>

```
(the blank line after it stays — just delete these 3 content lines plus the blank line that separates them from the `budget` block, so `orders` `TabsContent` is immediately followed by `budget` `TabsContent` with one blank line between, matching the existing style).

- [ ] **Step 4: Edit `src/routes/e.$slug.index.tsx`** — remove the booking sale-mode branch

Remove the import (currently line 10):
```tsx
import { EventBookingCard } from "@/components/checkout/EventBookingCard";
```

Change:
```tsx
  const isBooking = ev.sale_mode === "booking" && !!ev.booking_slug;
  const ticketCard = isBooking ? (
    <EventBookingCard eventId={ev.id} bookingSlug={ev.booking_slug as string} currency={ev.currency} />
  ) : (
    <Card className="p-5 border-black/10 shadow-sm bg-white text-foreground">
```
to:
```tsx
  const ticketCard = (
    <Card className="p-5 border-black/10 shadow-sm bg-white text-foreground">
```

And remove the now-dangling closing `)` that paired with the ternary (the block previously ended with `</Card>\n  );` closing both the JSX and the ternary — after this edit it should just close the parens around the JSX, i.e. it already ends `</Card>\n  );` unchanged, only the opening changed from `isBooking ? (\n ... \n) : (\n<Card...` to a plain `(\n<Card ...`. Re-read the full function after editing to confirm the parens balance (run the build in Step 8 to catch any mismatch — a syntax error here fails immediately).

- [ ] **Step 5: Edit `src/routes/_authenticated/dashboard.tsx`** — remove the inventory low-stock stat (the only non-ticketing table this file touches)

Change the import:
```tsx
import {
  Calendar, Plus, Ticket, DollarSign, Users, TrendingUp, Wallet,
  ShieldCheck, ArrowUpRight, Clock, Boxes, Receipt,
} from "lucide-react";
```
to:
```tsx
import {
  Calendar, Plus, Ticket, DollarSign, Users, TrendingUp, Wallet,
  ShieldCheck, ArrowUpRight, Clock, Receipt,
} from "lucide-react";
```

Change the stats state:
```tsx
  const [stats, setStats] = useState({ revenue: 0, ticketsSold: 0, orders: 0, expenses: 0, pendingRequests: 0, lowStock: 0 });
```
to:
```tsx
  const [stats, setStats] = useState({ revenue: 0, ticketsSold: 0, orders: 0, expenses: 0, pendingRequests: 0 });
```

Change the parallel query block:
```tsx
        const [{ data: ords }, tixRes, expRes, reqRes, recentRes, stockRes] = await Promise.all([
          supabase
          .from("orders")
          .select("total,status,event_id")
          .in("event_id", ids)
            .eq("status", "paid"),
          supabase
            .from("tickets")
            .select("id", { count: "exact", head: true })
            .in("event_id", ids),
          supabase
            .from("event_expenses")
            .select("amount")
            .in("event_id", ids),
          supabase
            .from("ticket_requests")
            .select("id", { count: "exact", head: true })
            .in("event_id", ids)
            .eq("status", "pending"),
          supabase
            .from("orders")
            .select("id,order_number,total,currency,status,buyer_name,created_at,event_id")
            .in("event_id", ids)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("event_inventory")
            .select("current_qty, inventory_items!inner(min_threshold, is_active)")
            .in("event_id", ids),
        ]);
        const revenue = (ords ?? []).reduce((a, b) => a + Number(b.total), 0);
        const expenses = (expRes.data ?? []).reduce((a, b) => a + Number(b.amount), 0);
        const stockRows = (stockRes.data ?? []) as unknown as Array<{ current_qty: number; inventory_items: { min_threshold: number; is_active: boolean } }>;
        const lowStock = stockRows.filter((r) => r.inventory_items?.is_active && Number(r.current_qty) <= Number(r.inventory_items.min_threshold)).length;
        setStats({
          revenue,
          ticketsSold: tixRes.count ?? 0,
          orders: (ords ?? []).length,
          expenses,
          pendingRequests: reqRes.count ?? 0,
          lowStock,
        });
```
to:
```tsx
        const [{ data: ords }, tixRes, expRes, reqRes, recentRes] = await Promise.all([
          supabase
          .from("orders")
          .select("total,status,event_id")
          .in("event_id", ids)
            .eq("status", "paid"),
          supabase
            .from("tickets")
            .select("id", { count: "exact", head: true })
            .in("event_id", ids),
          supabase
            .from("event_expenses")
            .select("amount")
            .in("event_id", ids),
          supabase
            .from("ticket_requests")
            .select("id", { count: "exact", head: true })
            .in("event_id", ids)
            .eq("status", "pending"),
          supabase
            .from("orders")
            .select("id,order_number,total,currency,status,buyer_name,created_at,event_id")
            .in("event_id", ids)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);
        const revenue = (ords ?? []).reduce((a, b) => a + Number(b.total), 0);
        const expenses = (expRes.data ?? []).reduce((a, b) => a + Number(b.amount), 0);
        setStats({
          revenue,
          ticketsSold: tixRes.count ?? 0,
          orders: (ords ?? []).length,
          expenses,
          pendingRequests: reqRes.count ?? 0,
        });
```

Change the subtitle copy:
```tsx
            {t("מבט חי על הכנסות, כרטיסים, מלאי ובקשות.", "Live view of revenue, tickets, stock and requests.")}
```
to:
```tsx
            {t("מבט חי על הכנסות, כרטיסים ובקשות.", "Live view of revenue, tickets and requests.")}
```

Change the KPI grid from 4 columns with the stock stat, to 3 columns without it:
```tsx
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Ticket className="h-4 w-4" />} label={t("כרטיסים שהונפקו", "Tickets issued")} value={stats.ticketsSold.toLocaleString()} tone="sky" />
        <Stat icon={<Users className="h-4 w-4" />} label={t("הזמנות ששולמו", "Paid orders")} value={stats.orders.toLocaleString()} tone="violet" />
        <Stat icon={<ShieldCheck className="h-4 w-4" />} label={t("בקשות ממתינות", "Pending requests")} value={stats.pendingRequests.toLocaleString()} tone="rose" />
        <Stat icon={<Boxes className="h-4 w-4" />} label={t("פריטים בחוסר", "Items low on stock")} value={stats.lowStock.toLocaleString()} tone={stats.lowStock > 0 ? "rose" : "sky"} />
      </div>
```
to:
```tsx
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={<Ticket className="h-4 w-4" />} label={t("כרטיסים שהונפקו", "Tickets issued")} value={stats.ticketsSold.toLocaleString()} tone="sky" />
        <Stat icon={<Users className="h-4 w-4" />} label={t("הזמנות ששולמו", "Paid orders")} value={stats.orders.toLocaleString()} tone="violet" />
        <Stat icon={<ShieldCheck className="h-4 w-4" />} label={t("בקשות ממתינות", "Pending requests")} value={stats.pendingRequests.toLocaleString()} tone="rose" />
      </div>
```

- [ ] **Step 6: Verify no dropped-module table names remain**

Run: `grep -rn "event_inventory\|inventory_items" src/routes/_authenticated/dashboard.tsx`
Expected: no output.

Run: `grep -rln "EventOpsTab\|EventBookingCard" src/`
Expected: no output (both were only referenced from the two files just edited).

- [ ] **Step 7: Verify route file count**

Run: `find src/routes -type f | wc -l`
Expected: `20` (10 `_authenticated/*`: route, dashboard, events.index, events.$id, events.new, onboarding, settings, team, reviews, admin + 4 `e.$slug*`/`order.*` + 6 top-level: `auth.tsx`, `reset-password.tsx`, `index.tsx`, `en.tsx`, `terms.tsx`, `en.terms.tsx` = 20).

- [ ] **Step 8: Commit**

```bash
git add src/__root.tsx src/router.tsx src/server.ts src/start.ts src/routes
git commit -m "Copy routes; remove Ops tab, booking sale-mode, and inventory dashboard stat"
```

---

### Task 6: Install, configure environment, and get a clean build

**Files:**
- Create: `.env` (not committed — already in `.gitignore` from Task 1), `.env.example`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: a working `npm run build` and `npm run lint`, and `node_modules` for local dev.

- [ ] **Step 1: Write `.env.example`** (placeholders only, safe to commit)

```
SUPABASE_PROJECT_ID=""
SUPABASE_PUBLISHABLE_KEY=""
SUPABASE_URL=""
VITE_SUPABASE_PROJECT_ID=""
VITE_SUPABASE_PUBLISHABLE_KEY=""
VITE_SUPABASE_URL=""
```

- [ ] **Step 2: Copy the real `.env` locally (not committed)**

```bash
cp /c/Users/Moshe/bright-funnel-lab/.env /c/Users/Moshe/bright-funnel-tickets/.env
```

This carries over `SUPABASE_PROJECT_ID`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL` and their `VITE_`-prefixed twins pointing at project `dmgjxvurkfjpuoegszcs`. The source `.env` also has `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`/`TRACKING_ID` — harmless to carry over (unused by ticketing code, but not worth stripping).

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: exits 0, `node_modules/` created, no `ERESOLVE` errors. If `@radix-ui/react-direction` fails to resolve, double check the version in Task 1 Step 1 matches what's on npm (`npm view @radix-ui/react-direction versions`).

- [ ] **Step 4: Type-check and build**

Run: `npm run build`
Expected: exits 0. This step also regenerates `src/routeTree.gen.ts` from the route files copied in Task 5 — confirm it now exists: `ls src/routeTree.gen.ts`.

If it fails with a missing-module error, the error names the missing file — check whether it's a file that should have been copied in Task 2/3/5 and wasn't, or a leftover import into a dropped file (re-run the `grep` checks from Task 5 Step 6 for the specific dropped symbol named in the error).

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: exits 0 (or only pre-existing warnings consistent with the source repo — the source repo has `"@typescript-eslint/no-unused-vars": "off"`, so leftover unused imports won't fail this step, but genuine syntax/type errors will already have failed Step 4).

- [ ] **Step 6: Commit**

```bash
git add .env.example
git commit -m "Add .env.example; app builds and lints clean"
```

(`.env` itself is not staged — verify with `git status` that it does not appear as untracked-to-be-added; it should be silently ignored per `.gitignore`.)

---

### Task 7: Smoke test the running app

**Files:** none (verification only)

**Interfaces:**
- Consumes: the fully built app from Task 6.

- [ ] **Step 1: Start the dev server in the background**

Run: `npm run dev` with `run_in_background: true` (or open a second terminal). Note the local URL it prints (typically `http://localhost:3000` or similar — read it from the actual output, don't assume).

- [ ] **Step 2: Curl the public landing page**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/`
Expected: `200`

- [ ] **Step 3: Curl the auth page**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/auth`
Expected: `200`

- [ ] **Step 4: Curl a public event page for a slug that doesn't exist**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/e/does-not-exist`
Expected: `200` (the route renders a "not found" state client-side rather than a hard 404 — confirm this matches actual behavior; if it 500s, that's a real bug to fix before calling this task done).

- [ ] **Step 5: Confirm no server-side console errors on startup**

Check the `npm run dev` process output captured so far.
Expected: no unhandled exceptions/stack traces during the three requests above beyond ordinary request logs.

- [ ] **Step 6: Stop the dev server**

Stop the background process started in Step 1.

- [ ] **Step 7: Commit** (only if any fixes were needed in Steps 2-5; otherwise skip — nothing to commit for a pure verification task)

---

### Task 8: Push and hand off

**Files:** none

- [ ] **Step 1: Push to origin**

```bash
git push origin main
```

- [ ] **Step 2: Verify on GitHub**

Run: `gh repo view mjobstlv-stack/bright-funnel-tickets --web=false --json url,pushedAt`
Expected: `pushedAt` reflects the just-completed push.

- [ ] **Step 3: Report back to the user**

Summarize: what's in the repo now (working app, not just docs), the smoke-test results from Task 7, and the two known pre-existing limitations (mock payment, no real email delivery) — so they can pass accurate expectations to their developer along with the link `https://github.com/mjobstlv-stack/bright-funnel-tickets`.
