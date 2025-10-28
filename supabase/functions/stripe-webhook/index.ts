import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createCorsResponse,
  createErrorResponse,
  createSuccessResponse,
} from '../_shared/response-utils.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return createCorsResponse();
  if (req.method !== 'POST')
    return createErrorResponse('Method not allowed', 405);

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: '2023-10-16',
  });
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const sig = req.headers.get('stripe-signature') ?? '';
    const bodyText = await req.text();
    const event = stripe.webhooks.constructEvent(bodyText, sig, webhookSecret);

    // Upsert stripe_events for idempotency/audit
    await supabase
      .from('stripe_events')
      .upsert(
        {
          id: event.id,
          type: event.type,
          payload: event as any,
          processed_at: new Date().toISOString(),
          success: true,
        },
        { onConflict: 'id' }
      );

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        // Minimal: record a contribution without strong linkage (frontend should map sponsorship_id via metadata in future)
        await supabase.from('contributions').insert({
          sponsorship_id: null,
          project_id: null,
          language_adoption_id: null,
          amount_cents: pi.amount_received ?? pi.amount,
          currency_code: (pi.currency || 'usd').toUpperCase(),
          occurred_at: new Date().toISOString(),
          kind: 'one_time',
          fee_cents: null,
          fee_covered_by_donor: null,
          stripe_payment_intent_id: pi.id,
          stripe_charge_id:
            Array.isArray(pi.charges?.data) && pi.charges.data[0]?.id
              ? pi.charges.data[0].id
              : null,
        });
        break;
      }
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice;
        await supabase.from('contributions').insert({
          sponsorship_id: null,
          project_id: null,
          language_adoption_id: null,
          amount_cents: inv.amount_paid ?? inv.amount_due ?? 0,
          currency_code: (inv.currency || 'usd').toUpperCase(),
          occurred_at: new Date().toISOString(),
          kind: 'subscription',
          fee_cents: null,
          fee_covered_by_donor: null,
          stripe_invoice_id: inv.id,
          stripe_subscription_id:
            typeof inv.subscription === 'string' ? inv.subscription : null,
        });
        break;
      }
      default:
        // no-op
        break;
    }

    return createSuccessResponse({ received: true });
  } catch (e) {
    // Try to log failed event
    try {
      const text = await req.text().catch(() => '');
      await supabase
        .from('stripe_events')
        .upsert({
          id: crypto.randomUUID(),
          type: 'unknown',
          payload: { error: (e as Error).message, body: text },
          processed_at: new Date().toISOString(),
          success: false,
          error_message: (e as Error).message,
        });
    } catch (e) {
      console.error('Error logging failed event:', e);
    }
    return createErrorResponse((e as Error).message, 400);
  }
});
