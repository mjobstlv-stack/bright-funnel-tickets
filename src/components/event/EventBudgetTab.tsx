import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Plus, Trash2, TrendingDown, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

export type Expense = {
  id: string;
  label: string;
  amount: number;
  category: string;
  note: string | null;
  created_at: string;
};
export type Staff = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  shift_start: string | null;
  shift_end: string | null;
  hourly_rate: number;
  notes: string | null;
  approval_status?: string | null;
};

export const EXPENSE_CATS = [
  { key: "venue", he: "מקום", en: "Venue" },
  { key: "catering", he: "כיבוד", en: "Catering" },
  { key: "staff", he: "צוות", en: "Staff" },
  { key: "marketing", he: "שיווק", en: "Marketing" },
  { key: "gear", he: "ציוד", en: "Gear" },
  { key: "other", he: "אחר", en: "Other" },
] as const;

export const STAFF_ROLES = [
  { key: "bartender", he: "ברמן/ית", en: "Bartender" },
  { key: "waiter", he: "מלצר/ית", en: "Waiter" },
  { key: "shift_manager", he: "מנהל/ת משמרת", en: "Shift manager" },
  { key: "guard", he: "מאבטח/ת", en: "Security guard" },
  { key: "host", he: "מארח/ת", en: "Host" },
  { key: "manager", he: "מנהל/ת", en: "Manager" },
  { key: "door", he: "כניסה", en: "Door" },
  { key: "bar", he: "בר", en: "Bar" },
  { key: "security", he: "אבטחה", en: "Security" },
  { key: "tech", he: "טכני", en: "Tech" },
  { key: "general", he: "כללי", en: "General" },
] as const;

export function money(n: number, cur = "ILS") {
  const sym = cur === "ILS" ? "₪" : cur === "USD" ? "$" : cur === "EUR" ? "€" : cur + " ";
  return `${sym}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function EventBudgetTab({ eventId, currency }: { eventId: string; currency: string }) {
  const { t } = useLang();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: exps }, { data: stf }, { data: ords }] = await Promise.all([
      supabase
        .from("event_expenses")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false }),
      supabase
        .from("event_staff")
        .select("*")
        .eq("event_id", eventId)
        .order("shift_start", { ascending: true, nullsFirst: false }),
      supabase.from("orders").select("total,status").eq("event_id", eventId).eq("status", "paid"),
    ]);
    setExpenses((exps ?? []) as Expense[]);
    setStaff((stf ?? []) as Staff[]);
    setRevenue((ords ?? []).reduce((s, o) => s + Number(o.total), 0));
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const staffCost = useMemo(
    () =>
      staff.reduce((sum, s) => {
        if (!s.shift_start || !s.shift_end) return sum;
        const hours =
          (new Date(s.shift_end).getTime() - new Date(s.shift_start).getTime()) / 3_600_000;
        return sum + Math.max(0, hours) * Number(s.hourly_rate || 0);
      }, 0),
    [staff],
  );
  const otherExp = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses],
  );
  const net = revenue - (otherExp + staffCost);

  if (loading) return <p className="text-sm text-muted-foreground">{t("טוען…", "Loading…")}</p>;

  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-4 gap-4">
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          label={t("הכנסות (שולם)", "Revenue (paid)")}
          value={money(revenue, currency)}
        />
        <SummaryCard
          icon={<TrendingDown className="h-4 w-4 text-red-600" />}
          label={t("הוצאות", "Expenses")}
          value={money(otherExp, currency)}
        />
        <SummaryCard
          icon={<Users className="h-4 w-4 text-sky-600" />}
          label={t("עלות צוות", "Staff cost")}
          value={money(staffCost, currency)}
        />
        <SummaryCard
          icon={
            <DollarSign className={`h-4 w-4 ${net >= 0 ? "text-emerald-600" : "text-red-600"}`} />
          }
          label={t("רווח נקי", "Net income")}
          value={money(net, currency)}
          highlight={net >= 0 ? "positive" : "negative"}
        />
      </div>

      <ExpensesSection eventId={eventId} currency={currency} expenses={expenses} onChange={load} />
      <StaffSection eventId={eventId} currency={currency} staff={staff} onChange={load} />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: "positive" | "negative";
}) {
  const ring =
    highlight === "positive"
      ? "ring-1 ring-emerald-200"
      : highlight === "negative"
        ? "ring-1 ring-red-200"
        : "";
  return (
    <Card className={`p-5 border-black/10 bg-white ${ring}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-display">{value}</div>
    </Card>
  );
}

function ExpensesSection({
  eventId,
  currency,
  expenses,
  onChange,
}: {
  eventId: string;
  currency: string;
  expenses: Expense[];
  onChange: () => void | Promise<void>;
}) {
  const { t, lang } = useLang();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!label.trim() || !amount) return toast.error(t("מלא/י שם וסכום", "Fill label and amount"));
    const num = Number(amount);
    if (Number.isNaN(num) || num < 0) return toast.error(t("סכום לא תקין", "Invalid amount"));
    setBusy(true);
    const { error } = await supabase.from("event_expenses").insert({
      event_id: eventId,
      label: label.trim(),
      amount: num,
      category,
      note: note.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setLabel("");
    setAmount("");
    setNote("");
    setCategory("other");
    await onChange();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("event_expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await onChange();
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-display">{t("הוצאות", "Expenses")}</h2>
      <Card className="p-4 border-black/10 bg-white">
        <div className="grid md:grid-cols-[1fr_140px_160px_1fr_auto] gap-2 items-end">
          <div>
            <Label className="text-xs">{t("שם ההוצאה", "Label")}</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("לדוגמה: DJ", "e.g. DJ")}
            />
          </div>
          <div>
            <Label className="text-xs">{t("סכום", "Amount")}</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-xs">{t("קטגוריה", "Category")}</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-md border border-black/15 bg-white text-sm px-3"
            >
              {EXPENSE_CATS.map((c) => (
                <option key={c.key} value={c.key}>
                  {lang === "he" ? c.he : c.en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">{t("הערה", "Note")}</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("לא חובה", "Optional")}
            />
          </div>
          <Button onClick={add} disabled={busy} className="rounded-full h-10">
            <Plus className="h-4 w-4 me-1" /> {t("הוסף", "Add")}
          </Button>
        </div>
      </Card>

      {expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("אין הוצאות עדיין.", "No expenses yet.")}
        </p>
      ) : (
        <Card className="border-black/10 divide-y divide-black/5">
          {expenses.map((e) => {
            const cat = EXPENSE_CATS.find((c) => c.key === e.category);
            return (
              <div key={e.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{e.label}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-full bg-black/[0.04] me-1">
                      {cat ? (lang === "he" ? cat.he : cat.en) : e.category}
                    </span>
                    {e.note && <span>· {e.note}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-medium">{money(Number(e.amount), currency)}</div>
                  <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </section>
  );
}

function ApprovalBadge({ status }: { status?: string | null }) {
  const map: Record<string, { he: string; cls: string }> = {
    draft: { he: "טיוטה", cls: "bg-black/[0.04] text-muted-foreground" },
    pending: {
      he: "ממתין לאישור מנהל משמרת",
      cls: "bg-amber-50 text-amber-800 border border-amber-200",
    },
    approved: { he: "אושר", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    rejected: { he: "נדחה", cls: "bg-red-50 text-red-700 border border-red-200" },
  };
  const m = status ? map[status] : undefined;
  if (!m) return null;
  return <span className={`text-[11px] px-2 py-0.5 rounded-full ${m.cls}`}>{m.he}</span>;
}

function StaffSection({
  eventId,
  currency,
  staff,
  onChange,
}: {
  eventId: string;
  currency: string;
  staff: Staff[];
  onChange: () => void | Promise<void>;
}) {
  const { t, lang } = useLang();
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("general");
  const [phone, setPhone] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return toast.error(t("מלא/י שם", "Fill a name"));
    setBusy(true);
    const { error } = await supabase.from("event_staff").insert({
      event_id: eventId,
      name: name.trim(),
      role,
      phone: phone.trim() || null,
      shift_start: start ? new Date(start).toISOString() : null,
      shift_end: end ? new Date(end).toISOString() : null,
      hourly_rate: rate ? Number(rate) : 0,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setName("");
    setRole("general");
    setPhone("");
    setStart("");
    setEnd("");
    setRate("");
    setNotes("");
    await onChange();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("event_staff").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await onChange();
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-display">{t("סידור עבודה", "Staff schedule")}</h2>
      <Card className="p-4 border-black/10 bg-white">
        <div className="grid md:grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">{t("שם", "Name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{t("תפקיד", "Role")}</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-10 w-full rounded-md border border-black/15 bg-white text-sm px-3"
            >
              {STAFF_ROLES.map((r) => (
                <option key={r.key} value={r.key}>
                  {lang === "he" ? r.he : r.en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">{t("טלפון", "Phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{t("תחילת משמרת", "Shift start")}</Label>
            <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{t("סיום משמרת", "Shift end")}</Label>
            <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{t("שכר לשעה", "Hourly rate")}</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs">{t("הערות", "Notes")}</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("לא חובה", "Optional")}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={add} disabled={busy} className="rounded-full">
            <Plus className="h-4 w-4 me-1" /> {t("הוסף איש צוות", "Add staff")}
          </Button>
        </div>
      </Card>

      {staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("אין עובדים משובצים.", "No staff scheduled.")}
        </p>
      ) : (
        <Card className="border-black/10 divide-y divide-black/5">
          {staff.map((s) => {
            const roleObj = STAFF_ROLES.find((r) => r.key === s.role);
            const hours =
              s.shift_start && s.shift_end
                ? Math.max(
                    0,
                    (new Date(s.shift_end).getTime() - new Date(s.shift_start).getTime()) /
                      3_600_000,
                  )
                : 0;
            const cost = hours * Number(s.hourly_rate || 0);
            const fmt = (v: string | null) =>
              v
                ? new Date(v).toLocaleString(lang === "he" ? "he-IL" : undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—";
            return (
              <div key={s.id} className="p-3 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-black/[0.04]">
                      {roleObj ? (lang === "he" ? roleObj.he : roleObj.en) : s.role}
                    </span>
                    {s.phone && <span className="text-xs text-muted-foreground">{s.phone}</span>}
                    <ApprovalBadge status={s.approval_status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {fmt(s.shift_start)} → {fmt(s.shift_end)}
                    {hours > 0 && <span> · {hours.toFixed(1)}h</span>}
                  </div>
                  {s.notes && (
                    <div className="text-xs text-muted-foreground mt-1 italic">{s.notes}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-end">
                    <div className="font-medium">{money(cost, currency)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {money(Number(s.hourly_rate || 0), currency)}/{t("שעה", "hr")}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </section>
  );
}
