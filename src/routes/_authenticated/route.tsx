import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/eventos-logo.svg.asset.json";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { LanguageToggle, useLang } from "@/lib/i18n";
import { getMyWorkspace } from "@/lib/team.functions";

type OrgRow = { id: string; name: string; role: string };

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const router = useRouterState();
  const [org, setOrg] = useState<OrgRow | null>(null);
  const [checkedOrg, setCheckedOrg] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/auth", search: { redirect: router.location.pathname } });
      return;
    }
    (async () => {
      // getMyWorkspace auto-creates a default org if the user has none, so
      // this no longer force-redirects to /onboarding — new users land
      // straight on their requested page. /onboarding is still reachable if
      // someone navigates to it directly, but bounces to /dashboard once an
      // org already exists (org details can be edited from Settings).
      const ws = await getMyWorkspace().catch(() => null);
      setOrg(ws ? { id: ws.orgId, name: ws.orgName, role: ws.role } : null);
      setCheckedOrg(true);
      if (ws && router.location.pathname === "/onboarding") {
        nav({ to: "/dashboard" });
      }
    })();
  }, [user, loading, nav, router.location.pathname]);

  if (loading || !user || !checkedOrg) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        {t("טוען…", "Loading…")}
      </div>
    );
  }

  const onOnboarding = router.location.pathname === "/onboarding";

  if (onOnboarding) {
    return (
      <div className="min-h-screen bg-[#fafafa] text-foreground">
        <header className="border-b border-black/10 bg-white">
          <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-16">
            <img src={logoAsset.url} alt="Event OS" className="h-7 w-auto" />
            <div className="flex items-center gap-2 text-sm">
              <LanguageToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  nav({ to: "/" });
                }}
              >
                <LogOut className="h-4 w-4 mx-1.5" /> {t("התנתקות", "Sign out")}
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-10">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#fafafa] text-foreground">
        <AppSidebar />
        <SidebarInset className="bg-transparent">
          <header className="sticky top-0 z-10 h-14 flex items-center gap-2 border-b border-black/10 bg-white/90 backdrop-blur px-4">
            <SidebarTrigger />
            <div className="ms-auto flex items-center gap-2 text-sm">
              {org && <span className="hidden sm:inline text-muted-foreground">{org.name}</span>}
              <LanguageToggle />
              <Button variant="ghost" size="sm" asChild>
                <Link to="/settings">
                  <Settings className="h-4 w-4 mx-1.5" /> {t("הגדרות", "Settings")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  nav({ to: "/" });
                }}
              >
                <LogOut className="h-4 w-4 mx-1.5" /> {t("התנתקות", "Sign out")}
              </Button>
            </div>
          </header>
          <main className="flex-1 w-full mx-auto max-w-7xl px-6 py-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
