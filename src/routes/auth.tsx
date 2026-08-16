import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { LanguageToggle, useLang } from "@/lib/i18n";

const searchSchema = z.object({ redirect: z.string().optional(), confirmed: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

type Step = "email" | "password" | "signup" | "forgot" | "sent";

function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { redirect, confirmed } = useSearch({ from: "/auth" });
  const { t, dir } = useLang();
  const [step, setStep] = useState<Step>("email");
  const [emailRaw, setEmail] = useState("");
  const [passwordRaw, setPassword] = useState("");
  const email = emailRaw.trim();
  const password = passwordRaw.trim();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentKind, setSentKind] = useState<"reset" | "confirm">("reset");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!loading && user) nav({ to: redirect || "/dashboard" });
  }, [user, loading, nav, redirect]);

  useEffect(() => {
    if (confirmed) toast.success(t("האימייל אומת. אפשר להתחבר.", "E-mail verified. You can sign in."));
  }, [confirmed, t]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  function authErrorText(err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    const low = msg.toLowerCase();
    if (low.includes("only request this after") || low.includes("rate limit") || low.includes("too many")) {
      return t("נשלחו יותר מדי מיילים ברגע זה. נסי שוב בעוד דקה.", "Too many e-mails just now. Try again in a minute.");
    }
    if (low.includes("weak") || low.includes("known to be weak")) {
      return t("הסיסמה חלשה מדי. בחרי סיסמה ארוכה וייחודית יותר.", "That password is too weak. Choose a longer, unique one.");
    }
    if (low.includes("already been registered") || low.includes("already registered")) {
      return t("הכתובת כבר רשומה. התחברי או אפסי סיסמה.", "That address is already registered. Sign in or reset your password.");
    }
    return msg || t("ההרשמה נכשלה", "Sign up failed");
  }

  async function sendSignup() {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth?confirmed=1`,
        data: { full_name: name },
      },
    });
    if (error) throw error;
    return data;
  }

  const stepIndex = step === "email" ? 0 : step === "sent" ? 2 : 1;
  const progress = ((stepIndex + 1) / 3) * 100;

  function back() {
    if (step === "password" || step === "signup" || step === "forgot") setStep("email");
    else if (step === "sent") setStep("email");
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStep("password");
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (/invalid/i.test(error.message)) {
          toast.error(t("סיסמה שגויה, או שהחשבון עדיין לא קיים.", "Wrong password, or account doesn't exist yet."));
        } else throw error;
      } else {
        toast.success(t("ברוכה השבה", "Welcome back"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("ההתחברות נכשלה", "Sign in failed"));
    } finally {
      setBusy(false);
    }
  }

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await sendSignup();
      if (data.session) {
        toast.success(t("החשבון נוצר", "Account created"));
      } else {
        setSentKind("confirm");
        setCooldown(60);
        setStep("sent");
      }
    } catch (err) {
      toast.error(authErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirm() {
    setBusy(true);
    try {
      await sendSignup();
      setCooldown(60);
      toast.success(t("שלחנו את מייל האישור מחדש", "Confirmation e-mail sent again"));
    } catch (err) {
      toast.error(authErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSentKind("reset");
      setStep("sent");
    } catch (err) {
      toast.error(authErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col" dir={dir}>
      {/* Top bar */}
      <div className="border-b border-black/5">
        <div className="mx-auto max-w-xl px-6 h-14 flex items-center justify-between">
          {step === "email" ? (
            <Link to="/" className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" /> {t("דף הבית", "Home")}
            </Link>
          ) : (
            <button onClick={back} className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" /> {t("חזרה", "Back")}
            </button>
          )}
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Event OS</span>
            <LanguageToggle />
          </div>
        </div>
        <div className="h-1 bg-black/5">
          <div className="h-full bg-foreground transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start sm:items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {step === "email" && (
            <form onSubmit={submitEmail} className="space-y-8">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("שלב 1 מתוך 2", "Step 1 of 2")}</div>
                <h1 className="mt-3 text-4xl sm:text-5xl font-display tracking-tight leading-[1.05]">
                  {t("מה האימייל שלך?", "What's your email?")}
                </h1>
                <p className="mt-3 text-muted-foreground">{t("נחבר אותך או ניצור לך סביבת עבודה חדשה.", "We'll sign you in or create your workspace.")}</p>
              </div>
              <Input
                autoFocus
                type="email"
                inputMode="email"
                placeholder="you@company.com"
                value={emailRaw}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 text-lg rounded-2xl border-black/15 focus-visible:ring-2 focus-visible:ring-foreground"
              />
              <Button type="submit" className="w-full h-14 rounded-full text-base">
                {t("המשך", "Continue")} <ArrowRight className="ms-2 h-4 w-4" />
              </Button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={submitPassword} className="space-y-8">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("שלב 2 מתוך 2", "Step 2 of 2")}</div>
                <h1 className="mt-3 text-4xl sm:text-5xl font-display tracking-tight leading-[1.05]">
                  {t("הזיני את הסיסמה שלך", "Enter your password")}
                </h1>
                <p className="mt-3 text-muted-foreground truncate">{t("מתחברת כ", "Signing in as")} <span className="text-foreground" dir="ltr">{email}</span></p>
              </div>
              <Input
                autoFocus
                type="password"
                placeholder="••••••••"
                value={passwordRaw}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-14 text-lg rounded-2xl border-black/15 focus-visible:ring-2 focus-visible:ring-foreground"
              />
              <Button type="submit" disabled={busy} className="w-full h-14 rounded-full text-base">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("התחברות", "Sign in")} <ArrowRight className="ms-2 h-4 w-4" /></>}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => setStep("forgot")} className="text-muted-foreground hover:text-foreground underline underline-offset-4">
                  {t("שכחת סיסמה?", "Forgot password?")}
                </button>
                <button type="button" onClick={() => setStep("signup")} className="text-foreground font-medium underline underline-offset-4">
                  {t("יצירת חשבון", "Create account")}
                </button>
              </div>
            </form>
          )}

          {step === "signup" && (
            <form onSubmit={submitSignup} className="space-y-6">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("יצירת חשבון", "Create account")}</div>
                <h1 className="mt-3 text-4xl sm:text-5xl font-display tracking-tight leading-[1.05]">
                  {t("כמה פרטים קטנים", "A couple of details")}
                </h1>
                <p className="mt-3 text-muted-foreground truncate">{t("עבור", "for")} <span className="text-foreground" dir="ltr">{email}</span></p>
              </div>
              <Input
                autoFocus
                placeholder={t("השם המלא שלך", "Your full name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-14 text-lg rounded-2xl border-black/15 focus-visible:ring-2 focus-visible:ring-foreground"
              />
              <Input
                type="password"
                placeholder={t("בחרי סיסמה", "Choose a password")}
                value={passwordRaw}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-14 text-lg rounded-2xl border-black/15 focus-visible:ring-2 focus-visible:ring-foreground"
              />
              <Button type="submit" disabled={busy} className="w-full h-14 rounded-full text-base">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("יצירת חשבון", "Create account")} <ArrowRight className="ms-2 h-4 w-4" /></>}
              </Button>
              <p className="text-xs text-muted-foreground">{t("בהמשך את מסכימה לתנאי השימוש שלנו.", "By continuing you agree to our terms.")}</p>
            </form>
          )}

          {step === "forgot" && (
            <form onSubmit={submitForgot} className="space-y-8">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("איפוס סיסמה", "Password reset")}</div>
                <h1 className="mt-3 text-4xl sm:text-5xl font-display tracking-tight leading-[1.05]">
                  {t("שלחו לי קישור", "Send me a link")}
                </h1>
                <p className="mt-3 text-muted-foreground">{t("נשלח קישור מאובטח לאיפוס אל", "We'll email a secure reset link to")} <span className="text-foreground" dir="ltr">{email}</span>.</p>
              </div>
              <Button type="submit" disabled={busy} className="w-full h-14 rounded-full text-base">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("שליחת קישור לאיפוס", "Send reset link")}
              </Button>
            </form>
          )}

          {step === "sent" && (
            <div className="space-y-8 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-foreground text-background grid place-items-center">
                <Check className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-display tracking-tight leading-[1.05]">{t("בדקי את המייל שלך", "Check your inbox")}</h1>
                <p className="mt-3 text-muted-foreground">
                  {sentKind === "confirm"
                    ? t("שלחנו קישור לאישור החשבון אל", "We sent an account confirmation link to")
                    : t("שלחנו קישור לאיפוס אל", "We sent a reset link to")}{" "}
                  <span className="text-foreground" dir="ltr">{email}</span>.
                </p>
                {sentKind === "confirm" && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-medium">{t("לא רואה את המייל? זה הגיוני.", "Don't see the e-mail? That's expected.")}</p>
                    <p className="mt-1">
                      {t(
                        "המייל נשלח מדומיין ברירת מחדל של Supabase, לכן יכול להיכנס לספאם או להיות מסומן כמסוכן. בדקי בתיקיית 'ספאם/דואר זבל' וב'קידומים'.",
                        "E-mails come from Supabase's default domain, so they may land in spam or be flagged. Check your Spam/Junk and Promotions folders.",
                      )}
                    </p>
                    <p className="mt-1">
                      {t(
                        "החשבון ייכנס לתוקף רק אחרי הלחיצה על הקישור.",
                        "The account activates only after you click the link.",
                      )}
                    </p>
                  </div>
                )}
              </div>
              {sentKind === "confirm" && (
                <Button
                  type="button"
                  onClick={resendConfirm}
                  disabled={busy || cooldown > 0}
                  className="w-full h-14 rounded-full text-base"
                >
                  {cooldown > 0
                    ? t(`שליחה מחדש בעוד ${cooldown} שניות`, `Resend in ${cooldown}s`)
                    : t("שליחת המייל מחדש", "Resend e-mail")}
                </Button>
              )}
              <Button type="button" onClick={() => setStep("email")} variant="outline" className="w-full h-14 rounded-full text-base">
                {t("שימוש באימייל אחר / יצירת חשבון אחר", "Use a different e-mail / create another account")}
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}