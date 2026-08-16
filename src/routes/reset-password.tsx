import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

function ResetPasswordPage() {
  const nav = useNavigate();
  const { t, dir } = useLang();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
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
            {ready
              ? t("הזיני סיסמה חדשה לחשבון שלך.", "Enter a new password for your account.")
              : t("ממתין לקישור לאיפוס…", "Waiting for reset link…")}
          </p>
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
        </Card>
      </div>
    </div>
  );
}
