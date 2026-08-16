import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getPayplusStatus, savePayplusCredentials } from "@/lib/payments.functions";
import { useLang } from "@/lib/i18n";

type Org = {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  description: string | null;
  custom_domain: string | null;
  payplus_enabled: boolean;
  payplus_mode: string;
};

type PayplusStatus = {
  api_key_set: boolean;
  secret_key_set: boolean;
  terminal_uid_set: boolean;
  payment_page_uid_set: boolean;
};

type CredsDraft = {
  api_key: string;
  secret_key: string;
  terminal_uid: string;
  payment_page_uid: string;
};

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [org, setOrg] = useState<Org | null>(null);
  const [payStatus, setPayStatus] = useState<PayplusStatus | null>(null);
  const [creds, setCreds] = useState<CredsDraft>({
    api_key: "",
    secret_key: "",
    terminal_uid: "",
    payment_page_uid: "",
  });
  useEffect(() => {
    if (!user) return;
    supabase
      .from("organizations")
      .select(
        "id,name,contact_email,contact_phone,website,description,custom_domain,payplus_enabled,payplus_mode",
      )
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setOrg(data as Org | null));
    getPayplusStatus()
      .then((s) => {
        if (s) setPayStatus(s);
      })
      .catch(() => {});
  }, [user]);
  if (!org) return <p className="text-sm text-muted-foreground">{t("טוען…", "Loading…")}</p>;

  async function save() {
    if (!org) return;
    const domain =
      (org.custom_domain ?? "")
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "") || null;
    const { error } = await supabase
      .from("organizations")
      .update({
        name: org.name,
        contact_email: org.contact_email,
        contact_phone: org.contact_phone,
        website: org.website,
        description: org.description,
        custom_domain: domain,
      })
      .eq("id", org.id);
    if (error) toast.error(error.message);
    else toast.success(t("נשמר", "Saved"));
  }

  async function savePayments() {
    if (!org) return;
    const { error } = await supabase
      .from("organizations")
      .update({
        payplus_enabled: org.payplus_enabled,
        payplus_mode: org.payplus_mode,
      })
      .eq("id", org.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    try {
      await savePayplusCredentials({
        data: {
          api_key: creds.api_key ? creds.api_key : undefined,
          secret_key: creds.secret_key ? creds.secret_key : undefined,
          terminal_uid: creds.terminal_uid ? creds.terminal_uid : undefined,
          payment_page_uid: creds.payment_page_uid ? creds.payment_page_uid : undefined,
        },
      });
      const s = await getPayplusStatus();
      if (s) setPayStatus(s);
      setCreds({ api_key: "", secret_key: "", terminal_uid: "", payment_page_uid: "" });
      toast.success(t("הגדרות תשלום נשמרו", "Payment settings saved"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("שמירת פרטי ההתחברות נכשלה", "Failed to save credentials"),
      );
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-display tracking-tight">{t("ארגון", "Organization")}</h1>
      <Card className="mt-6 p-6 border-black/10 space-y-4">
        <div>
          <Label>{t("שם", "Name")}</Label>
          <Input
            className="mt-1.5"
            value={org.name}
            onChange={(e) => setOrg({ ...org, name: e.target.value })}
          />
        </div>
        <div>
          <Label>{t("אימייל ליצירת קשר", "Contact email")}</Label>
          <Input
            className="mt-1.5"
            value={org.contact_email ?? ""}
            onChange={(e) => setOrg({ ...org, contact_email: e.target.value })}
          />
        </div>
        <div>
          <Label>{t("טלפון", "Phone")}</Label>
          <Input
            className="mt-1.5"
            value={org.contact_phone ?? ""}
            onChange={(e) => setOrg({ ...org, contact_phone: e.target.value })}
          />
        </div>
        <div>
          <Label>{t("אתר", "Website")}</Label>
          <Input
            className="mt-1.5"
            value={org.website ?? ""}
            onChange={(e) => setOrg({ ...org, website: e.target.value })}
          />
        </div>
        <div>
          <Label>{t("תיאור", "Description")}</Label>
          <Textarea
            className="mt-1.5"
            rows={3}
            value={org.description ?? ""}
            onChange={(e) => setOrg({ ...org, description: e.target.value })}
          />
        </div>
        <Button onClick={save} className="rounded-full">
          {t("שמירה", "Save")}
        </Button>
      </Card>

      <h2 className="mt-10 text-2xl font-display tracking-tight">
        {t("דומיין מותאם", "Custom domain")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(
          "הגישי את דפי האירוע מהדומיין שלך, למשל",
          "Serve your event pages from your own domain, e.g.",
        )}{" "}
        <code className="text-foreground">tickets.acme.com</code>.
      </p>
      <Card className="mt-4 p-6 border-black/10 space-y-4">
        <div>
          <Label>{t("דומיין", "Domain")}</Label>
          <Input
            className="mt-1.5"
            placeholder="tickets.acme.com"
            value={org.custom_domain ?? ""}
            onChange={(e) => setOrg({ ...org, custom_domain: e.target.value })}
          />
        </div>
        {org.custom_domain && (
          <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 text-sm space-y-2">
            <div className="font-medium">{t("הגדרת DNS", "DNS setup")}</div>
            <p className="text-muted-foreground">
              {t("אצל הרשם שלך, הוסיפי את הרשומה הבאה:", "At your registrar, add this record:")}
            </p>
            <pre className="bg-white border border-black/10 rounded px-3 py-2 text-xs overflow-x-auto">
              CNAME {org.custom_domain.replace(/^https?:\/\//, "").split("/")[0]} →
              cname.eventos.app
            </pre>
            <p className="text-xs text-muted-foreground">
              {t(
                "SSL מוקצה אוטומטית ברגע שה-DNS מתעדכן (עד 24 שעות).",
                "SSL is provisioned automatically once DNS propagates (up to 24h).",
              )}
            </p>
          </div>
        )}
        <Button onClick={save} className="rounded-full">
          {t("שמירת דומיין", "Save domain")}
        </Button>
      </Card>

      <h2 className="mt-10 text-2xl font-display tracking-tight">
        {t("תשלומים — PayPlus", "Payments — PayPlus")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(
          "חברי את טרמינל PayPlus שלך כדי לחייב כרטיסים אמיתיים. עדיין לא מחובר — הפרטים נשמרים להפעלה עתידית.",
          "Connect your PayPlus terminal to start charging real cards. Not connected yet — fields are saved for future activation.",
        )}
      </p>
      <Card className="mt-4 p-6 border-black/10 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-medium">
              {t("הפעלת סליקה ב-PayPlus", "Enable PayPlus checkout")}
            </div>
            <p className="text-sm text-muted-foreground">
              {t(
                "כשיהיה פעיל, קונים יופנו ל-PayPlus כדי לשלם. כרגע זה placeholder — הסליקה המדומה נשארת פעילה.",
                "When live, buyers will be redirected to PayPlus to pay. For now this is a placeholder — mock checkout stays active.",
              )}
            </p>
          </div>
          <Switch
            checked={org.payplus_enabled}
            onCheckedChange={(v) => setOrg({ ...org, payplus_enabled: v })}
          />
        </div>

        <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t(
            "בקרוב — האינטגרציה עדיין לא פעילה. שמירת הפרטים כאן בטוחה; שום דבר לא מחויב.",
            "Coming soon — the integration is not active yet. Saving credentials here is safe; nothing is charged.",
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>{t("סביבה", "Environment")}</Label>
            <select
              className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={org.payplus_mode}
              onChange={(e) => setOrg({ ...org, payplus_mode: e.target.value })}
            >
              <option value="test">{t("בדיקה (sandbox)", "Test (sandbox)")}</option>
              <option value="live">{t("חי (production)", "Live (production)")}</option>
            </select>
          </div>
          <div>
            <Label>Terminal UID</Label>
            <Input
              className="mt-1.5"
              placeholder={
                payStatus?.terminal_uid_set
                  ? t("••• נשמר — הזיני ערך חדש להחלפה", "••• saved — enter new value to replace")
                  : "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              }
              value={creds.terminal_uid}
              onChange={(e) => setCreds({ ...creds, terminal_uid: e.target.value })}
            />
          </div>
          <div>
            <Label>API key</Label>
            <Input
              className="mt-1.5"
              type="password"
              placeholder={
                payStatus?.api_key_set
                  ? t("••• נשמר — הזיני ערך חדש להחלפה", "••• saved — enter new value to replace")
                  : "pk_\u2026"
              }
              value={creds.api_key}
              onChange={(e) => setCreds({ ...creds, api_key: e.target.value })}
            />
          </div>
          <div>
            <Label>Secret key</Label>
            <Input
              className="mt-1.5"
              type="password"
              placeholder={
                payStatus?.secret_key_set
                  ? t("••• נשמר — הזיני ערך חדש להחלפה", "••• saved — enter new value to replace")
                  : "sk_\u2026"
              }
              value={creds.secret_key}
              onChange={(e) => setCreds({ ...creds, secret_key: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>
              Payment Page UID{" "}
              <span className="text-muted-foreground">{t("(אופציונלי)", "(optional)")}</span>
            </Label>
            <Input
              className="mt-1.5"
              placeholder={
                payStatus?.payment_page_uid_set
                  ? t("••• נשמר — הזיני ערך חדש להחלפה", "••• saved — enter new value to replace")
                  : t("דף ברירת מחדל אם ריק", "Default hosted page if unset")
              }
              value={creds.payment_page_uid}
              onChange={(e) => setCreds({ ...creds, payment_page_uid: e.target.value })}
            />
          </div>
        </div>

        <Button onClick={savePayments} className="rounded-full">
          {t("שמירת הגדרות תשלום", "Save payment settings")}
        </Button>
      </Card>
    </div>
  );
}
