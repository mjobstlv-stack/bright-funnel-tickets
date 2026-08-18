import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Reset password · Event OS" }] }),
});

// How long to wait for Supabase to establish a recovery session from the
// email link before telling the user it didn't work, instead of leaving
// them staring at "waiting for reset link" forever.
const LINK_TIMEOUT_MS = 8000;

function ResetPasswordPage() {
  const nav = useNavigate();
  const { t, dir } = useLang();
  const [ready, setReady] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // A link error (expired / already used) comes back as a query or hash
    // param instead of a session — surface it immediately instead of
    // waiting out the timeout.
    const params = new URLSearchParams(
      window.location.hash ? window.location.hash.slice(1) : window.location.search,
    );
    if (params.get("error")) {
      setLinkFailed(true);
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const timeout = window.setTimeout(() => {
      setReady((r) => {
        if (!r) setLinkFailed(true);
        return r;
      });
    }, LINK_TIMEOUT_MS);
    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("הסיסמה עודכנה. מפנה…", "Password updated. Redirecting…"));
      nav({ to: "/dashboard" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("עדכון הסיסמה נכשל", "Failed to update password"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4 py-12"
      dir={dir}
    >
      <div className="w-full max-w-md">
        <Card className="p-8 shadow-sm border-black/10">
          <h1 className="text-2xl font-display tracking-tight">
            {t("הגדרת סיסמה חדשה", "Set a new password")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {linkFailed
              ? t(
                  "הקישור פג תוקף או שכבר נוצל. בקשי קישור חדש.",
                  "This link expired or was already used. Request a new one.",
                )
              : ready
                ? t("הזיני סיסמה חדשה לחשבון שלך.", "Enter a new password for your account.")
                : t("ממתין לקישור לאיפוס…", "Waiting for reset link…")}
          </p>
          {linkFailed ? (
            <Button asChild className="mt-6 w-full h-11 rounded-full">
              <Link to="/auth">{t("בקשת קישור חדש", "Request a new link")}</Link>
            </Button>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <div>
                <Label htmlFor="password">{t("סיסמה חדשה", "New password")}</Label>
                <Input
                  id="password"
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1.5"
                />
              </div>
              <Button type="submit" disabled={busy || !ready} className="w-full h-11 rounded-full">
                {busy ? "…" : t("עדכון סיסמה", "Update password")}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
