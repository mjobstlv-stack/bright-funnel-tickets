import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { getOrderByToken } from "@/lib/orders.functions";

export const Route = createFileRoute("/order/$orderNumber")({
  component: OrderConfirm,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
});

type OrderT = { id: string; order_number: string; event_id: string; buyer_email: string };
type EventT = {
  name: string;
  slug: string;
  start_at: string | null;
  venue_name: string | null;
  event_type: string;
  online_url: string | null;
};
type TicketT = { id: string; qr_code: string };

function OrderConfirm() {
  const { orderNumber } = Route.useParams();
  const { token } = Route.useSearch();
  const [order, setOrder] = useState<OrderT | null>(null);
  const [tickets, setTickets] = useState<TicketT[]>([]);
  const [event, setEvent] = useState<EventT | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const payload = await getOrderByToken({ data: { orderNumber, token } });
        if (payload) {
          setOrder(payload.order as OrderT);
          setEvent(payload.event as EventT | null);
          setTickets((payload.tickets ?? []) as TicketT[]);
        }
      } catch {
        // ignore — order stays null and we show the not-found message
      }
      setLoading(false);
    })();
  }, [orderNumber, token]);

  if (loading)
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Loading\u2026
      </div>
    );
  if (!order)
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center text-sm text-muted-foreground">
        Order not found, or this link is missing its access token. Check the link in your
        confirmation email.
      </div>
    );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 grid place-items-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="mt-4 text-3xl font-display tracking-tight">You're in!</h1>
          <p className="mt-2 text-muted-foreground">
            Order <span className="font-mono">{order.order_number}</span> \u2014 a copy is on its
            way to {order.buyer_email}.
          </p>
        </div>

        <Card className="mt-8 p-6 border-black/10">
          <div className="text-sm text-muted-foreground">Event</div>
          <div className="text-xl font-display">{event?.name}</div>
          {event?.start_at && (
            <div className="text-sm mt-1">{new Date(event.start_at).toLocaleString()}</div>
          )}
          {event?.venue_name && (
            <div className="text-sm text-muted-foreground">{event.venue_name}</div>
          )}

          <div className="mt-6">
            <div className="text-sm text-muted-foreground mb-2">
              Your tickets ({tickets.length})
            </div>
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li key={t.id} className="font-mono text-xs bg-black/[0.03] rounded-md px-3 py-2">
                  {t.qr_code}
                </li>
              ))}
            </ul>
          </div>
          {event?.online_url && (
            <div className="mt-6 rounded-xl border border-black/10 p-4 bg-gradient-to-br from-pink-50 to-sky-50">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Your join link
              </div>
              <a
                href={event.online_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block font-medium underline break-all"
              >
                {event.online_url}
              </a>
            </div>
          )}
        </Card>

        {event?.slug && (
          <div className="mt-6 text-center">
            <Link to="/e/$slug" params={{ slug: event.slug }} className="text-sm underline">
              Back to event
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
