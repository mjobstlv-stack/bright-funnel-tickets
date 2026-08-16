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
