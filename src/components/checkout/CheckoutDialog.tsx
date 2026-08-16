import { useState } from "react";
import { Loader2, AlertCircle, CreditCard, Smartphone, Wallet } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  createPendingOrder,
  finalizeMockOrder,
  issueTicketsForOrder,
} from "@/lib/orders.functions";

export type CheckoutItem = {
  tt: {
    id: string;
    name: string;
    price: number;
    quantity_sold: number;
    kind?: "ticket" | "reservation";
    deposit_amount?: number;
    balance_on_site?: boolean;
  };
  quantity: number;
};

export function CheckoutDialog({
  open,
  onOpenChange,
  event,
  items,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: { id: string; name: string; currency: string } | null;
  items: CheckoutItem[];
}) {
  const nav = useNavigate();
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"idle" | "creating" | "charging" | "issuing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"card" | "applepay" | "googlepay" | "bit">("card");
  const [card, setCard] = useState({ number: "", name: "", exp: "", cvc: "", installments: "1" });

  function fmtCard(v: string) {
    return v
      .replace(/\D/g, "")
      .slice(0, 19)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  }
  function fmtExp(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  }

  const fullValue = items.reduce((s, it) => s + Number(it.tt.price) * it.quantity, 0);
  const subtotal = items.reduce(
    (s, it) =>
      s +
      (it.tt.kind === "reservation" ? Number(it.tt.deposit_amount ?? 0) : Number(it.tt.price)) *
        it.quantity,
    0,
  );
  const fees = 0;
  const grandTotal = subtotal + fees;
  const hasDeposit = items.some((it) => it.tt.kind === "reservation");
  const balanceOnSite = Math.max(0, fullValue - subtotal);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setError(null);
    setBusy(true);
    setStage("creating");
    try {
      const order = await createPendingOrder({
        data: {
          eventId: event.id,
          buyerName: buyer.name,
          buyerEmail: buyer.email,
          buyerPhone: buyer.phone || null,
          currency: event.currency,
          items: items.map((it) => ({ ticketTypeId: it.tt.id, quantity: it.quantity })),
        },
      });

      setStage("charging");
      await finalizeMockOrder({ data: { orderId: order.id, token: order.access_token } });

      setStage("issuing");
      await issueTicketsForOrder({
        data: {
          orderId: order.id,
          token: order.access_token,
          holderName: buyer.name,
          items: items.map((it) => ({ ticketTypeId: it.tt.id, quantity: it.quantity })),
        },
      });

      toast.success("Payment successful — issuing tickets");
      onOpenChange(false);
      nav({
        to: "/order/$orderNumber",
        params: { orderNumber: order.order_number },
        search: { token: order.access_token },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
      setStage("idle");
    }
  }

  if (!event) return null;

  const stageLabel =
    stage === "creating"
      ? "Creating order…"
      : stage === "charging"
        ? "Charging payment…"
        : stage === "issuing"
          ? "Issuing tickets…"
          : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) onOpenChange(v);
      }}
    >
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Checkout</DialogTitle>
            <DialogDescription>{event.name}</DialogDescription>
          </DialogHeader>

          <form onSubmit={pay} className="mt-5 space-y-4" aria-busy={busy} noValidate>
            <div role="status" aria-live="polite" className="sr-only">
              {busy ? stageLabel : ""}
            </div>

            {error && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Checkout failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <fieldset disabled={busy} className="contents">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="co-name">Full name *</Label>
                  <Input
                    id="co-name"
                    required
                    autoComplete="name"
                    value={buyer.name}
                    onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="co-email">Email *</Label>
                  <Input
                    id="co-email"
                    required
                    type="email"
                    autoComplete="email"
                    value={buyer.email}
                    onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="co-phone">Phone</Label>
                  <Input
                    id="co-phone"
                    type="tel"
                    autoComplete="tel"
                    value={buyer.phone}
                    onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-black/5">
                <div
                  id="pm-label"
                  className="text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Payment method
                </div>
                <div className="mt-2 rounded-2xl border border-black/10 bg-gradient-to-br from-pink-50 via-white to-sky-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 rounded-lg bg-black text-white grid place-items-center text-xs font-bold"
                        aria-hidden="true"
                      >
                        P+
                      </div>
                      <div>
                        <div className="text-sm font-semibold">PayPlus secure checkout</div>
                        <div className="text-[11px] text-muted-foreground">PCI-DSS · 3D Secure</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-widest px-2 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      Coming soon
                    </span>
                  </div>

                  <div
                    role="radiogroup"
                    aria-labelledby="pm-label"
                    className="grid grid-cols-4 gap-2"
                  >
                    {[
                      { id: "card", label: "Card", Icon: CreditCard },
                      { id: "applepay", label: "Apple Pay", Icon: Smartphone },
                      { id: "googlepay", label: "Google Pay", Icon: Smartphone },
                      { id: "bit", label: "Bit", Icon: Wallet },
                    ].map((m) => {
                      const active = method === m.id;
                      const Icon = m.Icon;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={m.label}
                          onClick={() => setMethod(m.id as typeof method)}
                          className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${active ? "border-black bg-white shadow-sm ring-2 ring-amber-300" : "border-black/10 bg-white/70 hover:bg-white"}`}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {method === "card" && (
                    <div className="rounded-xl bg-white border border-black/10 p-3 space-y-2">
                      <div>
                        <Label htmlFor="cc-num" className="text-[11px]">
                          Card number
                        </Label>
                        <Input
                          id="cc-num"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          placeholder="1234 5678 9012 3456"
                          value={card.number}
                          onChange={(e) => setCard({ ...card, number: fmtCard(e.target.value) })}
                          className="mt-1 font-mono tracking-wider"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cc-name" className="text-[11px]">
                          Cardholder name
                        </Label>
                        <Input
                          id="cc-name"
                          autoComplete="cc-name"
                          placeholder="As shown on card"
                          value={card.name}
                          onChange={(e) => setCard({ ...card, name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor="cc-exp" className="text-[11px]">
                            Expiry
                          </Label>
                          <Input
                            id="cc-exp"
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            placeholder="MM/YY"
                            value={card.exp}
                            onChange={(e) => setCard({ ...card, exp: fmtExp(e.target.value) })}
                            className="mt-1 font-mono"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cc-cvc" className="text-[11px]">
                            CVC
                          </Label>
                          <Input
                            id="cc-cvc"
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            placeholder="123"
                            maxLength={4}
                            value={card.cvc}
                            onChange={(e) =>
                              setCard({ ...card, cvc: e.target.value.replace(/\D/g, "") })
                            }
                            className="mt-1 font-mono"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cc-inst" className="text-[11px]">
                            Pmts
                          </Label>
                          <select
                            id="cc-inst"
                            aria-label="Installments"
                            value={card.installments}
                            onChange={(e) => setCard({ ...card, installments: e.target.value })}
                            className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                          >
                            {[1, 2, 3, 6, 12].map((n) => (
                              <option key={n} value={n}>
                                {n === 1 ? "Full" : `${n}×`}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg bg-white/70 border border-black/5 p-3 space-y-1 text-sm">
                    {hasDeposit && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Reservation value</span>
                        <span>
                          {event.currency} {fullValue.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>{hasDeposit ? "Deposit charged now" : "Subtotal"}</span>
                      <span>
                        {event.currency} {subtotal.toLocaleString()}
                      </span>
                    </div>
                    {hasDeposit && balanceOnSite > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Balance on site (card)</span>
                        <span>
                          {event.currency} {balanceOnSite.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>Fees / VAT</span>
                      <span>Included</span>
                    </div>
                    <div className="flex justify-between font-display text-base pt-1.5 border-t border-black/10">
                      <span>{hasDeposit ? "Pay now" : "Total"}</span>
                      <span>
                        {event.currency} {grandTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>

            <Button
              type="submit"
              disabled={busy || items.length === 0}
              aria-live="polite"
              className="w-full h-12 rounded-full text-base"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{stageLabel || "Processing…"}</span>
                </>
              ) : (
                <span>
                  {hasDeposit ? "Pay deposit" : "Pay"} {event.currency}{" "}
                  {grandTotal.toLocaleString()}
                </span>
              )}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              {hasDeposit
                ? "Sandbox mode — your spot is held; the balance is charged on site by card."
                : "Sandbox mode — tickets issued instantly to your email."}
            </p>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
