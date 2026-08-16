import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, Wand2 } from "lucide-react";
import { useLang } from "@/lib/i18n";

export type DayHours = { date: string; start: string; end: string; closed?: boolean };

const DEFAULT_START = "20:00";
const DEFAULT_END = "23:59";

function toDateStr(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

function toTimeStr(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(11, 16);
}

function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

function rangeDates(from: string, to: string): string[] {
  if (!from) return [];
  const out: string[] = [];
  let cur = from;
  const last = to && to >= from ? to : from;
  // hard cap so a typo can't explode the UI
  for (let i = 0; i < 120 && cur <= last; i++) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** Local "YYYY-MM-DD" + "HH:MM" -> ISO string */
export function localToIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function buildDayHours(
  from: string,
  to: string,
  start: string,
  end: string,
  existing: DayHours[],
): DayHours[] {
  const byDate = new Map(existing.map((d) => [d.date, d]));
  return rangeDates(from, to).map((date) => {
    const prev = byDate.get(date);
    return {
      date,
      start: prev?.start || start,
      end: prev?.end || end,
      closed: prev?.closed ?? false,
    };
  });
}

/**
 * Multi-day scheduling field: a date range, bulk "from–to" hours applied to
 * every day, plus per-day overrides (including marking a day as closed).
 */
export function EventDaysField({
  startAt,
  endAt,
  dayHours,
  errors,
  onChange,
}: {
  startAt: string | null;
  endAt: string | null;
  dayHours: DayHours[];
  errors?: { start_at?: string; end_at?: string };
  onChange: (patch: {
    start_at: string | null;
    end_at: string | null;
    day_hours: DayHours[];
  }) => void;
}) {
  const { t } = useLang();

  const days = dayHours ?? [];
  const fromDate = days[0]?.date || toDateStr(startAt);
  const toDate = days[days.length - 1]?.date || toDateStr(endAt) || fromDate;
  const bulkStart = days[0]?.start || toTimeStr(startAt) || DEFAULT_START;
  const bulkEnd = days[0]?.end || toTimeStr(endAt) || DEFAULT_END;

  const multi = useMemo(() => rangeDates(fromDate, toDate).length > 1, [fromDate, toDate]);

  function commit(next: DayHours[]) {
    const open = next.filter((d) => !d.closed);
    const first = open[0];
    const last = open[open.length - 1];
    let end: string | null = null;
    if (last) {
      // an "end" earlier than "start" means the day rolls past midnight
      const endDate = last.end <= last.start ? addDays(last.date, 1) : last.date;
      end = localToIso(endDate, last.end);
    }
    onChange({
      start_at: first ? localToIso(first.date, first.start) : null,
      end_at: end,
      day_hours: next,
    });
  }

  function setRange(from: string, to: string) {
    commit(buildDayHours(from, to || from, bulkStart, bulkEnd, days));
  }

  function setBulkHours(start: string, end: string) {
    const base = days.length ? days : buildDayHours(fromDate, toDate, start, end, []);
    commit(base.map((d) => ({ ...d, start, end })));
  }

  function patchDay(date: string, patch: Partial<DayHours>) {
    commit(days.map((d) => (d.date === date ? { ...d, ...patch } : d)));
  }

  function applyFirstToAll() {
    const f = days[0];
    if (!f) return;
    commit(days.map((d) => ({ ...d, start: f.start, end: f.end })));
  }

  const weekday = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("he-IL", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  };

  return (
    <div className="rounded-2xl border border-black/10 p-5 bg-white/60 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4" />
        <div className="text-sm font-medium">{t("מתי האירוע?", "When is the event?")}</div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1.5 block">{t("תאריך התחלה", "Start date")} *</Label>
          <Input
            type="date"
            aria-invalid={!!errors?.start_at}
            value={fromDate}
            onChange={(e) =>
              setRange(e.target.value, toDate && toDate >= e.target.value ? toDate : e.target.value)
            }
          />
          {errors?.start_at && <p className="text-xs text-red-600 mt-1">{errors.start_at}</p>}
        </div>
        <div>
          <Label className="mb-1.5 block">{t("תאריך סיום", "End date")} *</Label>
          <Input
            type="date"
            aria-invalid={!!errors?.end_at}
            min={fromDate || undefined}
            value={toDate}
            onChange={(e) => setRange(fromDate, e.target.value)}
          />
          {errors?.end_at && <p className="text-xs text-red-600 mt-1">{errors.end_at}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1.5 block">{t("משעה (לכל הימים)", "From (all days)")}</Label>
          <Input
            type="time"
            value={bulkStart}
            onChange={(e) => setBulkHours(e.target.value, bulkEnd)}
          />
        </div>
        <div>
          <Label className="mb-1.5 block">{t("עד שעה (לכל הימים)", "To (all days)")}</Label>
          <Input
            type="time"
            value={bulkEnd}
            onChange={(e) => setBulkHours(bulkStart, e.target.value)}
          />
        </div>
      </div>

      {multi && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {t(
                "עריכה נקודתית לימים ספציפיים — ניתן לשנות שעות או לסמן יום כסגור.",
                "Per-day overrides — change the hours or mark a day as closed.",
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={applyFirstToAll}
            >
              <Wand2 className="h-3.5 w-3.5 me-1" /> {t("החל על כל הימים", "Apply to all days")}
            </Button>
          </div>
          <div className="rounded-xl border border-black/10 divide-y">
            {days.map((d) => (
              <div key={d.date} className="flex items-center gap-3 p-2.5 flex-wrap">
                <div className="text-sm w-28 shrink-0">{weekday(d.date)}</div>
                <Input
                  type="time"
                  className="w-28"
                  disabled={d.closed}
                  value={d.start}
                  onChange={(e) => patchDay(d.date, { start: e.target.value })}
                />
                <span className="text-muted-foreground text-xs">—</span>
                <Input
                  type="time"
                  className="w-28"
                  disabled={d.closed}
                  value={d.end}
                  onChange={(e) => patchDay(d.date, { end: e.target.value })}
                />
                <div className="ms-auto flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {d.closed ? t("סגור", "Closed") : t("פעיל", "Open")}
                  </span>
                  <Switch
                    checked={!d.closed}
                    onCheckedChange={(v) => patchDay(d.date, { closed: !v })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
