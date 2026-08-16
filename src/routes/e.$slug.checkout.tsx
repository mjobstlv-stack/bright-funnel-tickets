import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  createPendingOrder,
  finalizeMockOrder,
  issueTicketsForOrder,
} from "@/lib/orders.functions";
import { getRequestByToken } from "@/lib/requests.functions";

export const Route = createFileRoute("/e/$slug/checkout")({
  component: Checkout,
  validateSearch: (s: Record<string, unknown>) => ({
    req: typeof s.req === "string" ? s.req : undefined,
    token: typeof s.token === "string" ? s.token : undefined,
  }),
});

type CartItem = { id: string; quantity: number };
type EventT = { id: string; name: string; currency: string };
type TT = { id: string; name: string; price: number; quantity_sold: number };

function Checkout() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const nav = useNavigate();
  const [ev, setEv] = useState<EventT | null>(null);
  const [items, setItems] = useState<{ tt: TT; quantity: number }[]>([]);
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
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

  useEffect(() => {
    (async () => {
      // Approved-request flow: load request + ticket_type directly
      if (search.req && search.token) {
        const res = await getRequestByToken({
          data: { requestId: search.req, token: search.token },
        });
        if (res && !res.blocked && res.event && res.ticket_type) {
          setEv({ id: res.event.id, name: res.event.name, currency: res.event.currency });
          setItems([
            {
              tt: {
                id: res.ticket_type.id,
                name: res.ticket_type.name,
                price: res.ticket_type.price,
                quantity_sold: 0,
              },
              quantity: res.request.quantity ?? 1,
            },
          ]);
          setBuyer({
            name: res.request.buyer_name,
            email: res.request.buyer_email,
            phone: res.request.buyer_phone ?? "",
          });
          return;
        }
        toast.error("This request is not approved or the link is invalid");
      }
      const raw = sessionStorage.getItem("eos_cart");
      if (!raw) {
        nav({ to: "/e/$slug", params: { slug } });
        return;
      }
      const cart: { eventId: string; items: CartItem[] } = JSON.parse(raw);
      const { data: e } = await supabase
        .from("events")
        .select("id,name,currency")
        .eq("id", cart.eventId)
        .maybeSingle();
      setEv(e as EventT | null);
      const ids = cart.items.map((i) => i.id);
      const { data: tts } = await supabase
        .from("ticket_types")
        .select("id,name,price,quantity_sold")
        .in("id", ids);
      const merged = cart.items
        .map((i) => ({
          tt: (tts ?? []).find((t) => t.id === i.id) as TT | undefined,
          quantity: i.quantity,
        }))
        .filter((x): x is { tt: TT; quantity: number } => !!x.tt);
      setItems(merged);
    })();
  }, [slug, nav, search.req, search.token]);

  const total = items.reduce((s, it) => s + Number(it.tt.price) * it.quantity, 0);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!ev) return;
    setBusy(true);
    try {
      const order = await createPendingOrder({
        data: {
          eventId: ev.id,
          buyerName: buyer.name,
          buyerEmail: buyer.email,
          buyerPhone: buyer.phone || null,
          currency: ev.currency,
          items: items.map((it) => ({ ticketTypeId: it.tt.id, quantity: it.quantity })),
        },
      });

      await finalizeMockOrder({ data: { orderId: order.id, token: order.access_token } });

      await issueTicketsForOrder({
        data: {
          orderId: order.id,
          token: order.access_token,
          holderName: buyer.name,
          items: items.map((it) => ({ ticketTypeId: it.tt.id, quantity: it.quantity })),
        },
      });

      sessionStorage.removeItem("eos_cart");
      nav({
        to: "/order/$orderNumber",
        params: { orderNumber: order.order_number },
        search: { token: order.access_token },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ev)
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );

  const subtotal: number = total;
  const fees: number = 0;
  const grandTotal: number = subtotal + fees;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          to="/e/$slug"
          params={{ slug }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to event
        </Link>
        <h1 className="mt-3 text-3xl font-display tracking-tight">Checkout</h1>
        <p className="text-sm text-muted-foreground">{ev.name}</p>

        <div className="mt-8 grid md:grid-cols-[1fr_320px] gap-6">
          <Card className="p-6 border-black/10">
            <form onSubmit={pay} className="space-y-4">
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
              <div>
                <Label>Phone</Label>
                <Input
                  value={buyer.phone}
                  onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div className="pt-4 border-t border-black/5">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Payment method
                </Label>
                <div className="mt-2 rounded-2xl border border-black/10 bg-gradient-to-br from-pink-50 via-white to-sky-50 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-black text-white grid place-items-center text-xs font-bold tracking-tight">
                        P+
                      </div>
                      <div>
                        <div className="text-sm font-semibold">PayPlus secure checkout</div>
                        <div className="text-[11px] text-muted-foreground">
                          PCI-DSS · 3D Secure · Tokenized
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-widest px-2 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      Coming soon
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "card", label: "Credit card", sub: "Visa · MC · Amex" },
                      { id: "applepay", label: "Apple Pay", sub: "" },
                      { id: "googlepay", label: "Google Pay", sub: "" },
                      { id: "bit", label: "Bit", sub: "" },
                    ].map((m) => {
                      const active = method === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMethod(m.id as typeof method)}
                          className={`text-start rounded-xl border p-3 transition ${active ? "border-black bg-white shadow-sm ring-2 ring-amber-300" : "border-black/10 bg-white/70 hover:bg-white"}`}
                        >
                          <div className="text-xs font-semibold">{m.label}</div>
                          {m.sub && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {method === "card" && (
                    <div className="rounded-xl bg-white border border-black/10 p-4 space-y-3">
                      <div>
                        <Label className="text-[11px]">Card number</Label>
                        <Input
                          inputMode="numeric"
                          autoComplete="cc-number"
                          placeholder="1234 5678 9012 3456"
                          value={card.number}
                          onChange={(e) => setCard({ ...card, number: fmtCard(e.target.value) })}
                          className="mt-1 font-mono tracking-wider"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">Cardholder name</Label>
                        <Input
                          autoComplete="cc-name"
                          placeholder="As shown on card"
                          value={card.name}
                          onChange={(e) => setCard({ ...card, name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[11px]">Expiry</Label>
                          <Input
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            placeholder="MM/YY"
                            value={card.exp}
                            onChange={(e) => setCard({ ...card, exp: fmtExp(e.target.value) })}
                            className="mt-1 font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px]">CVC</Label>
                          <Input
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
                      </div>
                      <div>
                        <Label className="text-[11px]">Installments</Label>
                        <select
                          value={card.installments}
                          onChange={(e) => setCard({ ...card, installments: e.target.value })}
                          className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                        >
                          {[1, 2, 3, 6, 12].map((n) => (
                            <option key={n} value={n}>
                              {n === 1
                                ? "Pay in full"
                                : `${n} × ${ev.currency} ${(grandTotal / n).toFixed(2)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {method === "applepay" && (
                    <button
                      type="button"
                      className="w-full h-12 rounded-xl bg-black text-white font-medium flex items-center justify-center gap-2 hover:bg-black/90"
                    >
                      <span></span> Pay
                    </button>
                  )}
                  {method === "googlepay" && (
                    <button
                      type="button"
                      className="w-full h-12 rounded-xl bg-white border border-black/20 text-black font-medium flex items-center justify-center gap-2 hover:bg-black/5"
                    >
                      <span className="text-blue-600 font-bold">G</span> Pay
                    </button>
                  )}
                  {method === "bit" && (
                    <div className="rounded-xl bg-white border border-black/10 p-4 text-sm space-y-2">
                      <div className="font-semibold">Pay with Bit</div>
                      <p className="text-[11px] text-muted-foreground">
                        You'll be redirected to the Bit app to approve {ev.currency}{" "}
                        {grandTotal.toLocaleString()}.
                      </p>
                    </div>
                  )}

                  <div className="rounded-lg bg-white/70 border border-black/5 p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>
                        {ev.currency} {subtotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Processing fees</span>
                      <span>
                        {fees === 0 ? "Included" : `${ev.currency} ${fees.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>VAT</span>
                      <span>Included</span>
                    </div>
                    <div className="flex justify-between font-display text-base pt-1.5 border-t border-black/10">
                      <span>Total due</span>
                      <span>
                        {ev.currency} {grandTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Live PayPlus integration is coming soon. Your order is processed in sandbox mode
                    and tickets are issued instantly to your email.
                  </p>
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full h-12 rounded-full text-base">
                {busy ? "Processing…" : `Pay ${ev.currency} ${grandTotal.toLocaleString()}`}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                By completing this purchase you agree to the terms of sale and refund policy.
              </p>
            </form>
          </Card>
          <Card className="p-5 border-black/10 h-fit">
            <h2 className="font-display">Order summary</h2>
            <ul className="mt-3 divide-y divide-black/5 text-sm">
              {items.map((it) => (
                <li key={it.tt.id} className="py-2 flex justify-between">
                  <span>
                    {it.quantity} × {it.tt.name}
                  </span>
                  <span>
                    {ev.currency} {(it.quantity * Number(it.tt.price)).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-black/10 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>
                  {ev.currency} {subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Fees</span>
                <span>{fees === 0 ? "Included" : `${ev.currency} ${fees.toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between font-display text-base pt-2 border-t border-black/10">
                <span>Total</span>
                <span>
                  {ev.currency} {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-black/10 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Secured by</span>
              <span className="flex items-center gap-1.5">
                <span className="h-5 px-1.5 rounded bg-black text-white text-[9px] font-bold grid place-items-center">
                  P+
                </span>
                PayPlus
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
