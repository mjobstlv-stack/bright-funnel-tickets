import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { toast } from "sonner";
import { generateEventPage } from "@/lib/ai-page.functions";
import type { TablesUpdate } from "@/integrations/supabase/types";
import {
  Sparkles,
  Music,
  GraduationCap,
  Tent,
  Upload,
  X,
  Loader2,
  Check,
  PenLine,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

type Category = "concert" | "conference" | "festival";

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `event-${Math.random().toString(36).slice(2, 6)}`
  );
}

async function uploadFile(userId: string, folder: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const up = await supabase.storage
    .from("event-media")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (up.error) throw up.error;
  const signed = await supabase.storage
    .from("event-media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signed.error || !signed.data) throw signed.error ?? new Error("Sign failed");
  return signed.data.signedUrl;
}

export function EventGeneratorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();

  const [category, setCategory] = useState<Category | null>(null);
  const [prompt, setPrompt] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [brandFile, setBrandFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<"form" | "generating" | "done">("form");
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);

  const canGenerate = !!category && prompt.trim().length >= 10 && !!user;

  const categories = useMemo(
    () => [
      { id: "concert" as const, icon: Music, he: "הופעה / מסיבה", en: "Concert / Party" },
      {
        id: "conference" as const,
        icon: GraduationCap,
        he: "כנס / וובינר",
        en: "Conference / Webinar",
      },
      { id: "festival" as const, icon: Tent, he: "פסטיבל", en: "Festival" },
    ],
    [],
  );

  function reset() {
    setCategory(null);
    setPrompt("");
    setWebsite("");
    setInstagram("");
    setFacebook("");
    setLogoFile(null);
    setBrandFile(null);
    setPhase("form");
    setCreatedEventId(null);
  }

  function close() {
    if (phase === "generating") return;
    reset();
    onOpenChange(false);
  }

  async function handleGenerate() {
    if (!user || !category) return;
    setPhase("generating");
    try {
      // 1. Upload assets first (if any)
      let logoUrl: string | undefined;
      let brandUrl: string | undefined;
      if (logoFile) {
        logoUrl = await uploadFile(user.id, "logos", logoFile);
      }
      if (brandFile) {
        brandUrl = await uploadFile(user.id, "brand-books", brandFile);
      }

      // 2. Get or create org
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!org)
        throw new Error(
          t("לא נמצא ארגון — סיימי הרשמה קודם", "No organization — complete onboarding first"),
        );

      // 3. Create draft event (placeholder name; will update after AI)
      const tempName =
        prompt.split(/[.\n!?]/)[0].slice(0, 60) || (lang === "he" ? "אירוע חדש" : "New event");
      const tempSlug = slugify(tempName) + "-" + Math.random().toString(36).slice(2, 6);
      const { data: created, error: createErr } = await supabase
        .from("events")
        .insert({
          org_id: org.id,
          name: tempName,
          slug: tempSlug,
          status: "draft",
          event_type: "physical",
          logo_url: logoUrl ?? null,
        })
        .select("id")
        .single();
      if (createErr || !created) throw createErr ?? new Error("Create failed");
      setCreatedEventId(created.id);

      // 4. Call AI
      const gen = await generateEventPage({
        data: {
          eventId: created.id,
          prompt: prompt.trim(),
          language: lang,
          eventCategory: category,
          logoUrl,
          brandBookUrl: brandUrl,
          brandBookMime: brandFile?.type,
          websiteUrl: website.trim() || undefined,
          instagramUrl: instagram.trim() || undefined,
          facebookUrl: facebook.trim() || undefined,
        },
      });

      // 5. Apply generated fields to the event
      const patch: TablesUpdate<"events"> = {
        name: gen.name || tempName,
        tagline: gen.tagline || null,
        description: gen.description || null,
        template: gen.template,
      };
      if (gen.bg_color) patch.bg_color = gen.bg_color;
      if (gen.text_color) patch.text_color = gen.text_color;
      if (gen.highlights?.length) patch.highlights = gen.highlights;
      if (gen.includes?.length) patch.includes = gen.includes;
      if (gen.faq?.length) patch.faq = gen.faq;
      if (gen.rules?.length) patch.rules = gen.rules;
      if (gen.schedule?.length) patch.schedule = gen.schedule;
      await supabase.from("events").update(patch).eq("id", created.id);

      // 6. Log analytics
      await supabase.from("ai_generation_events").insert({
        user_id: user.id,
        event_id: created.id,
        event_type: category,
        language: lang,
        has_logo: !!logoUrl,
        has_brand_book: !!brandUrl,
        has_website: !!website.trim(),
        has_instagram: !!instagram.trim(),
        has_facebook: !!facebook.trim(),
        prompt_length: prompt.trim().length,
        succeeded: true,
      });

      setPhase("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
      if (user) {
        await supabase.from("ai_generation_events").insert({
          user_id: user.id,
          event_id: null,
          event_type: category ?? "unknown",
          language: lang,
          has_logo: !!logoFile,
          has_brand_book: !!brandFile,
          has_website: !!website.trim(),
          has_instagram: !!instagram.trim(),
          has_facebook: !!facebook.trim(),
          prompt_length: prompt.trim().length,
          succeeded: false,
          error_message: msg.slice(0, 500),
        });
      }
      setPhase("form");
    }
  }

  function goPerfect() {
    if (!createdEventId) return;
    onOpenChange(false);
    nav({ to: "/events/$id", params: { id: createdEventId } });
  }

  function goEdit() {
    if (!createdEventId) return;
    onOpenChange(false);
    nav({ to: "/events/$id", params: { id: createdEventId } });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
        else onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {phase === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-2xl">
                <Sparkles className="h-5 w-5" />
                {t("בואי ניצור את דף האירוע", "Let's build your event page")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "3 שלבים קצרים ואת מקבלת דף מוכן. אפשר לערוך הכל אחר כך.",
                  "3 quick steps and you get a ready page. Edit anything after.",
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* Step 1 */}
              <section>
                <Label className="text-sm font-medium">{t("1. סוג האירוע", "1. Event type")}</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {categories.map((c) => {
                    const Icon = c.icon;
                    const active = category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategory(c.id)}
                        className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${active ? "border-black bg-black text-white" : "border-black/15 hover:border-black/40"}`}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="text-xs font-medium text-center">{t(c.he, c.en)}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Step 2 */}
              <section>
                <Label htmlFor="gen-prompt" className="text-sm font-medium">
                  {t("2. ספרי לי על האירוע", "2. Tell me about the event")}
                </Label>
                <Textarea
                  id="gen-prompt"
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t(
                    "לדוגמה: מסיבת רוק של להקת X ב-15.3 במתחם הבלוק תל אביב. כניסה 120₪, דלתות ב-21:00, הופעה ב-22:30. חבילות VIP עם בר פתוח.",
                    "e.g. Rock party with band X on Mar 15 at The Block Tel Aviv. Doors 21:00, show 22:30. VIP packages with open bar. Entry 120₪.",
                  )}
                  className="mt-2 text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {prompt.trim().length}/3000 ·{" "}
                  {t("כמה שיותר פרטים = תוצאה טובה יותר", "More detail = better result")}
                </p>
              </section>

              {/* Step 3 */}
              <section>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {t("3. הזהות שלך", "3. Your identity")}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {t("רשות — אבל מומלץ", "optional but recommended")}
                  </span>
                </div>

                <div className="mt-3 grid sm:grid-cols-2 gap-2">
                  <FileSlot
                    icon={ImageIcon}
                    label={t("לוגו", "Logo")}
                    hint={t("PNG/SVG/JPG", "PNG/SVG/JPG")}
                    file={logoFile}
                    onPick={() => logoInputRef.current?.click()}
                    onClear={() => setLogoFile(null)}
                  />
                  <FileSlot
                    icon={FileText}
                    label={t("ספר מותג", "Brand book")}
                    hint={t("PDF או תמונה", "PDF or image")}
                    file={brandFile}
                    onPick={() => brandInputRef.current?.click()}
                    onClear={() => setBrandFile(null)}
                  />
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size <= 4 * 1024 * 1024) setLogoFile(f);
                      else if (f) toast.error(t("עד 4MB", "Max 4MB"));
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={brandInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size <= 8 * 1024 * 1024) setBrandFile(f);
                      else if (f) toast.error(t("עד 8MB", "Max 8MB"));
                      e.target.value = "";
                    }}
                  />
                </div>

                <div className="mt-3 grid gap-2">
                  <UrlInput
                    value={website}
                    onChange={setWebsite}
                    placeholder={t("אתר קיים (https://...)", "Existing website (https://...)")}
                  />
                  <UrlInput
                    value={instagram}
                    onChange={setInstagram}
                    placeholder="Instagram (@handle or URL)"
                  />
                  <UrlInput value={facebook} onChange={setFacebook} placeholder="Facebook (URL)" />
                </div>
              </section>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={close}>
                {t("ביטול", "Cancel")}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="rounded-full h-11 px-6"
              >
                <Sparkles className="h-4 w-4 me-2" />
                {t("צרי לי דף", "Generate my page")}
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "generating" && (
          <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin" />
            <div>
              <div className="font-display text-xl">
                {t("בונה את הדף שלך…", "Building your page…")}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t(
                  "קורא את הלוגו, בוחר צבעים, כותב טקסטים, בונה סקשיינים.",
                  "Reading logo, picking colors, writing copy, building sections.",
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                {t("~10-20 שניות", "~10-20 seconds")}
              </p>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="py-8 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 grid place-items-center">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="mt-4 font-display text-2xl">
              {t("הדף מוכן ✨", "Your page is ready ✨")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              {t(
                "איך את מרגישה עם זה? אפשר לפרסם עכשיו, או להוסיף טאץ' אישי.",
                "How does it feel? You can publish now, or add a personal touch.",
              )}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={goPerfect} className="rounded-full h-11 px-6">
                <Check className="h-4 w-4 me-2" />
                {t("מושלם, קחי אותי לדף", "Perfect, take me there")}
              </Button>
              <Button variant="outline" onClick={goEdit} className="rounded-full h-11 px-6">
                <PenLine className="h-4 w-4 me-2" />
                {t("טאץ' אישי", "Personal touch")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FileSlot({
  icon: Icon,
  label,
  hint,
  file,
  onPick,
  onClear,
}: {
  icon: typeof Sparkles;
  label: string;
  hint: string;
  file: File | null;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={file ? undefined : onPick}
      className={`group relative flex items-center gap-3 rounded-xl border p-3 text-start transition ${file ? "border-emerald-300 bg-emerald-50/50" : "border-dashed border-black/20 hover:border-black/50"}`}
    >
      <div
        className={`grid place-items-center h-9 w-9 rounded-lg ${file ? "bg-emerald-100 text-emerald-700" : "bg-black/5"}`}
      >
        {file ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground truncate">{file ? file.name : hint}</div>
      </div>
      {file ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onClear();
            }
          }}
          className="p-1 rounded hover:bg-black/5 cursor-pointer"
          aria-label="Clear"
        >
          <X className="h-4 w-4" />
        </span>
      ) : (
        <Upload className="h-4 w-4 opacity-40 group-hover:opacity-80" />
      )}
    </button>
  );
}

function UrlInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir="ltr"
      className="text-sm h-10"
    />
  );
}
