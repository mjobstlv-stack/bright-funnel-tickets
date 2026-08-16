import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0590-\u05ff]+/gi, "-")
    .replace(/^-|-$/g, "");
}

function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { t } = useLang();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const finalSlug = slug || slugify(name);
      const { data: created, error } = await supabase
        .from("organizations")
        .insert({
          owner_id: user.id,
          name,
          slug: finalSlug,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          website: website || null,
          description: description || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (created) {
        await supabase.from("org_members").insert({
          org_id: created.id,
          user_id: user.id,
          role: "admin",
          email: user.email ?? null,
          display_name: user.email ?? null,
        });
      }
      toast.success(t("הארגון נוצר", "Organization created"));
      nav({ to: "/dashboard" });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("יצירת הארגון נכשלה", "Failed to create organization"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-display tracking-tight">
        {t("הגדרת הארגון שלך", "Set up your organization")}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {t(
          "זה המותג שיופיע בדפי האירועים, בכרטיסים ובחשבוניות שלך.",
          "This is the brand that appears on your event pages, tickets and invoices.",
        )}
      </p>
      <Card className="mt-6 p-8 border-black/10 shadow-sm">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">{t("שם הארגון *", "Organization name *")}</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) setSlug(slugify(e.target.value));
                }}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="slug">{t("כתובת URL *", "URL handle *")}</Label>
              <Input
                id="slug"
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                eventos.app/o/{slug || "your-handle"}
              </p>
            </div>
            <div>
              <Label htmlFor="email">{t("אימייל ליצירת קשר", "Contact email")}</Label>
              <Input
                id="email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="phone">{t("טלפון ליצירת קשר", "Contact phone")}</Label>
              <Input
                id="phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="web">{t("אתר אינטרנט", "Website")}</Label>
              <Input
                id="web"
                type="url"
                placeholder="https://"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="desc">{t("תיאור קצר", "Short description")}</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1.5"
              />
            </div>
          </div>
          <Button type="submit" disabled={busy} className="rounded-full h-11 px-6">
            {busy ? t("יוצר…", "Creating…") : t("יצירת ארגון →", "Create organization →")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
