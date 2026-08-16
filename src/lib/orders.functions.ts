import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TokenInput = z.object({
  orderNumber: z.string().min(1),
  token: z.string().uuid(),
});

export const getOrderByToken = createServerFn({ method: "POST" })
  .inputValidator((d) => TokenInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, event_id, buyer_email, buyer_name, status, total, currency, created_at, access_token",
      )
      .eq("order_number", data.orderNumber)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order || order.access_token !== data.token) return null;

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("name, slug, start_at, venue_name, event_type, online_url")
      .eq("id", order.event_id)
      .maybeSingle();

    const { data: tickets } = await supabaseAdmin
      .from("tickets")
      .select("id, qr_code")
      .eq("order_id", order.id);

    return {
      order: {
        id: order.id,
        order_number: order.order_number,
        event_id: order.event_id,
        buyer_email: order.buyer_email,
        buyer_name: order.buyer_name,
        status: order.status,
        total: order.total,
        currency: order.currency,
        created_at: order.created_at,
      },
      event: event
        ? {
            name: event.name,
            slug: event.slug,
            start_at: event.start_at,
            venue_name: event.venue_name,
            event_type: event.event_type,
            online_url: order.status === "paid" ? event.online_url : null,
          }
        : null,
      tickets: tickets ?? [],
    };
  });

const FinalizeInput = z.object({
  orderId: z.string().uuid(),
  token: z.string().uuid(),
});

export const finalizeMockOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => FinalizeInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, access_token, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order || order.access_token !== data.token) throw new Error("Invalid order token");
    if (order.status === "paid") return { ok: true };
    if (order.status !== "pending") throw new Error("Order cannot be finalized");

    const { error: upErr } = await supabaseAdmin
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", order.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });

const CreateOrderInput = z.object({
  eventId: z.string().uuid(),
  buyerName: z.string().min(1),
  buyerEmail: z.string().email(),
  buyerPhone: z.string().nullable().optional(),
  currency: z.string().min(1),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().uuid(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1)
    .max(20),
});

export const createPendingOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => CreateOrderInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify event exists and is published (server-authoritative)
    const { data: ev, error: evErr } = await supabaseAdmin
      .from("events")
      .select("id, status, currency")
      .eq("id", data.eventId)
      .maybeSingle();
    if (evErr) throw new Error(evErr.message);
    if (!ev || ev.status !== "published") throw new Error("Event is not available for purchase");
    if (ev.currency !== data.currency) throw new Error("Currency mismatch");

    // Server-side price lookup + ownership/activity check
    const ids = data.items.map((it) => it.ticketTypeId);
    const { data: tts, error: ttErr } = await supabaseAdmin
      .from("ticket_types")
      .select("id, event_id, price, is_active, min_per_order, max_per_order, kind, deposit_amount")
      .in("id", ids);
    if (ttErr) throw new Error(ttErr.message);
    const ttMap = new Map((tts ?? []).map((t) => [t.id, t]));
    for (const it of data.items) {
      const tt = ttMap.get(it.ticketTypeId);
      if (!tt) throw new Error("Invalid ticket type");
      if (tt.event_id !== data.eventId)
        throw new Error("Ticket type does not belong to this event");
      if (!tt.is_active) throw new Error("Ticket type is not on sale");
      if (tt.min_per_order && it.quantity < tt.min_per_order)
        throw new Error("Below minimum per order");
      if (tt.max_per_order && it.quantity > tt.max_per_order)
        throw new Error("Above maximum per order");
    }

    // Atomically reserve inventory; roll back all reservations on failure.
    const reserved: Array<{ ticketTypeId: string; quantity: number }> = [];
    try {
      for (const it of data.items) {
        const { data: ok, error: rErr } = await supabaseAdmin.rpc("reserve_ticket_inventory", {
          _ticket_type_id: it.ticketTypeId,
          _event_id: data.eventId,
          _qty: it.quantity,
        });
        if (rErr) throw new Error(rErr.message);
        if (!ok) throw new Error("Sold out or sales window closed");
        reserved.push({ ticketTypeId: it.ticketTypeId, quantity: it.quantity });
      }
    } catch (err) {
      for (const r of reserved) {
        await supabaseAdmin.rpc("release_ticket_inventory", {
          _ticket_type_id: r.ticketTypeId,
          _qty: r.quantity,
        });
      }
      throw err;
    }

    // Compute values from server-known prices.
    // Reservation tiers only charge the deposit now; the balance is paid on site.
    const fullValue = data.items.reduce((s, it) => {
      const tt = ttMap.get(it.ticketTypeId)!;
      return s + it.quantity * Number(tt.price);
    }, 0);
    const chargedNow = data.items.reduce((s, it) => {
      const tt = ttMap.get(it.ticketTypeId)!;
      const unit = tt.kind === "reservation" ? Number(tt.deposit_amount ?? 0) : Number(tt.price);
      return s + it.quantity * unit;
    }, 0);

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        event_id: data.eventId,
        buyer_name: data.buyerName,
        buyer_email: data.buyerEmail,
        buyer_phone: data.buyerPhone ?? null,
        subtotal: fullValue,
        total: chargedNow,
        currency: data.currency,
        status: "pending",
        payment_method: "mock",
        payment_ref: "MOCK-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      })
      .select("id, order_number, access_token")
      .single();
    if (oErr) {
      for (const r of reserved) {
        await supabaseAdmin.rpc("release_ticket_inventory", {
          _ticket_type_id: r.ticketTypeId,
          _qty: r.quantity,
        });
      }
      throw new Error(oErr.message);
    }

    const rows = data.items.map((it) => ({
      order_id: order.id,
      ticket_type_id: it.ticketTypeId,
      quantity: it.quantity,
      unit_price: Number(ttMap.get(it.ticketTypeId)!.price),
    }));
    const { error: oiErr } = await supabaseAdmin.from("order_items").insert(rows);
    if (oiErr) throw new Error(oiErr.message);

    return {
      id: order.id,
      order_number: order.order_number,
      access_token: order.access_token as string,
    };
  });

const IssueTicketsInput = z.object({
  orderId: z.string().uuid(),
  token: z.string().uuid(),
  holderName: z.string().min(1),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().uuid(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
});

export const issueTicketsForOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => IssueTicketsInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("id, event_id, access_token, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order || order.access_token !== data.token) throw new Error("Invalid order token");
    if (order.status !== "paid") throw new Error("Order is not paid");

    // Idempotency: don't re-issue if tickets already exist for this order
    const { count: existing } = await supabaseAdmin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("order_id", order.id);
    if ((existing ?? 0) > 0) return { ok: true, count: existing ?? 0 };

    // Verify requested items match this order's line items (no fabrication)
    const { data: oItems, error: oiErr } = await supabaseAdmin
      .from("order_items")
      .select("ticket_type_id, quantity")
      .eq("order_id", order.id);
    if (oiErr) throw new Error(oiErr.message);
    const orderMap = new Map<string, number>();
    for (const oi of oItems ?? [])
      orderMap.set(oi.ticket_type_id, (orderMap.get(oi.ticket_type_id) ?? 0) + oi.quantity);
    const reqMap = new Map<string, number>();
    for (const it of data.items)
      reqMap.set(it.ticketTypeId, (reqMap.get(it.ticketTypeId) ?? 0) + it.quantity);
    if (orderMap.size !== reqMap.size) throw new Error("Items mismatch");
    for (const [k, v] of orderMap) if (reqMap.get(k) !== v) throw new Error("Items mismatch");

    const rows = data.items.flatMap((it) =>
      Array.from({ length: it.quantity }, () => ({
        order_id: order.id,
        ticket_type_id: it.ticketTypeId,
        event_id: order.event_id,
        holder_name: data.holderName,
      })),
    );
    const { error: tErr } = await supabaseAdmin.from("tickets").insert(rows);
    if (tErr) throw new Error(tErr.message);

    return { ok: true, count: rows.length };
  });
