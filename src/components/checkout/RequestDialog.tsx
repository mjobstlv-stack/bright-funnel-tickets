import { useRef, useState } from "react";
import { Loader2, CheckCircle2, Instagram, Facebook, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { submitTicketRequest } from "@/lib/requests.functions";

export type RequestTicket = { id: string; name: string; price: number };

async function fileToDataUrl(file: File, maxSide = 1400): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function ShotUpload({
  label,
  icon,
  required,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  required?: boolean;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await fileToDataUrl(file));
    } catch {
      toast.error("Could not read that image");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Label className="flex items-center gap-1.5">
        {icon} {label} {required && "*"}
      </Label>
      {value ? (
        <div className="mt-1.5 relative rounded-lg overflow-hidden border border-black/10">
          <img src={value} alt={`${label} screenshot`} className="w-full max-h-56 object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 end-2 h-7 w-7 grid place-items-center rounded-full bg-background/90 border border-black/10"
            aria-label="Remove screenshot"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-1.5 w-full h-24 rounded-lg border border-dashed border-black/20 grid place-items-center text-xs text-muted-foreground hover:border-black/40 transition"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload a screenshot of your profile
            </span>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
    </div>
  );
}

export function RequestDialog({
  open,
  onOpenChange,
  event,
  tickets,
  requireInstagram,
  requireFacebook,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: { id: string; name: string; currency: string } | null;
  tickets: RequestTicket[];
  requireInstagram: boolean;
  requireFacebook: boolean;
}) {
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" });
  const [ig, setIg] = useState<string | null>(null);
  const [fb, setFb] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string>(tickets[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    if (requireInstagram && !ig) {
      toast.error("Instagram profile screenshot is required");
      return;
    }
    if (requireFacebook && !fb) {
      toast.error("Facebook profile screenshot is required");
      return;
    }
    if (!ig && !fb) {
      toast.error("At least one profile screenshot is required");
      return;
    }
    setBusy(true);
    try {
      await submitTicketRequest({
        data: {
          eventId: event.id,
          ticketTypeId: ticketId || null,
          buyerName: buyer.name.trim(),
          buyerEmail: buyer.email.trim(),
          buyerPhone: buyer.phone.trim() || null,
          instagramShot: ig,
          facebookShot: fb,
          quantity: qty,
        },
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  function close(v: boolean) {
    if (!v) {
      setDone(false);
      setBuyer({ name: "", email: "", phone: "" });
      setIg(null);
      setFb(null);
      setQty(1);
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        {done ? (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 grid place-items-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <DialogTitle className="text-xl">Request submitted</DialogTitle>
            <DialogDescription className="max-w-sm mx-auto">
              We'll review your profile and email you a payment link if approved. This usually takes
              a few minutes.
            </DialogDescription>
            <Button onClick={() => close(false)} className="rounded-full mt-2">
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request to attend</DialogTitle>
              <DialogDescription>
                This event requires approval. Share your details and screenshots of your social
                profiles — we'll review and email you a payment link if approved.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full name *</Label>
                  <Input
                    required
                    value={buyer.name}
                    onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    required
                    type="email"
                    value={buyer.email}
                    onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={buyer.phone}
                  onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <ShotUpload
                label="Instagram profile screenshot"
                icon={<Instagram className="h-3.5 w-3.5" />}
                required={requireInstagram}
                value={ig}
                onChange={setIg}
              />
              <ShotUpload
                label="Facebook profile screenshot"
                icon={<Facebook className="h-3.5 w-3.5" />}
                required={requireFacebook}
                value={fb}
                onChange={setFb}
              />
              {tickets.length > 1 && (
                <div>
                  <Label>Ticket type</Label>
                  <select
                    className="mt-1.5 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                  >
                    {tickets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {event?.currency} {t.price.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label>Guests</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                  className="mt-1.5 w-24"
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full h-11 rounded-full mt-2">
                {busy && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {busy ? "Submitting…" : "Submit for approval"}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                You won't be charged until you're approved and complete payment.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
