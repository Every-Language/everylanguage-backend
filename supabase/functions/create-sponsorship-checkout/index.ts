import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';

type Purpose = 'operations' | 'adoption';
type PaymentMode = 'card' | 'bank_transfer';

interface RequestBody {
  purpose: Purpose;
  adoptionIds?: string[]; // required for adoption
  donor: { firstName: string; lastName: string; email: string; phone?: string };
  mode: PaymentMode; // card or bank_transfer
  donateOnlyCents?: number; // optional one-time donation only
}

function parseAmount(n?: number): number | null {
  if (typeof n !== 'number') return null;
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  return i >= 0 ? i : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return createCorsResponse();
  if (req.method !== 'POST')
    return createErrorResponse('Method not allowed', 405);

  try {
    const body = (await req.json()) as RequestBody;
    const { purpose, adoptionIds = [], donor, mode, donateOnlyCents } = body;
    if (!purpose || !donor?.email || !donor?.firstName || !donor?.lastName) {
      return createErrorResponse('Missing required fields', 400);
    }
    if (purpose === 'adoption' && adoptionIds.length === 0) {
      return createErrorResponse(
        'adoptionIds required for purpose=adoption',
        400
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      httpClient: Stripe.createFetchHttpClient(),
      apiVersion: '2023-10-16',
    });

    // Create or reuse Stripe Customer by email
    const customers = await stripe.customers.list({
      email: donor.email,
      limit: 1,
    });
    const customer =
      customers.data[0] ??
      (await stripe.customers.create({
        email: donor.email,
        name: `${donor.firstName} ${donor.lastName}`.trim(),
        phone: donor.phone,
        metadata: { source: 'everylanguage', purpose },
      }));

    // Read global funding settings
    const { data: settingsRows } = await supabase
      .from('funding_settings')
      .select('deposit_percent,recurring_months')
      .limit(1);
    const globalDeposit = settingsRows?.[0]?.deposit_percent ?? 0.2;
    const globalMonths = settingsRows?.[0]?.recurring_months ?? 12;

    // Adoption flow: compute per-language deposit and recurring
    let depositTotal = 0;
    const subscriptionItems: { price_data: any; quantity: number }[] = [];
    const adoptionSummaries: {
      id: string;
      name: string | null;
      depositCents: number;
      recurringCents: number;
    }[] = [];

    if (purpose === 'adoption') {
      const { data: adoptions, error: aErr } = await supabase
        .from('language_adoptions')
        .select(
          'id, language_entity_id, estimated_budget_cents, deposit_percent, recurring_months, language_entities(name)'
        )
        .in('id', adoptionIds);
      if (aErr)
        return createErrorResponse(
          `DB error (language_adoptions): ${aErr.message}`,
          500
        );

      for (const a of adoptions ?? []) {
        const depositPercent = a.deposit_percent ?? globalDeposit;
        const months = a.recurring_months ?? globalMonths;
        const budget = Math.max(0, a.estimated_budget_cents ?? 0);
        const deposit = Math.round(budget * depositPercent);
        const recurring = Math.max(
          0,
          Math.round((budget - deposit) / Math.max(1, months))
        );
        depositTotal += deposit;
        adoptionSummaries.push({
          id: a.id,
          name: (a as any).language_entities?.name ?? null,
          depositCents: deposit,
          recurringCents: recurring,
        });
        if (mode === 'card' && recurring > 0) {
          subscriptionItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Adoption: ${(a as any).language_entities?.name ?? a.id}`,
              },
              unit_amount: recurring,
              recurring: { interval: 'month' },
            },
            quantity: 1,
          });
        }
      }
    }

    // donateOnly path: one-time only
    const donateOnly = parseAmount(donateOnlyCents);
    const oneTimeAmount =
      donateOnly ?? (purpose === 'adoption' ? depositTotal : null);

    // Create PaymentIntent for one-time (if any)
    let paymentIntentClientSecret: string | null = null;
    if (oneTimeAmount && oneTimeAmount > 0) {
      const pi = await stripe.paymentIntents.create({
        amount: oneTimeAmount,
        currency: 'usd',
        customer: customer.id,
        automatic_payment_methods: { enabled: true },
        metadata: { purpose, type: donateOnly ? 'donate_only' : 'deposit' },
      });
      paymentIntentClientSecret = pi.client_secret ?? null;
    }

    // Create Subscription for recurring (adoption + card only)
    let subscriptionId: string | null = null;
    if (
      purpose === 'adoption' &&
      mode === 'card' &&
      subscriptionItems.length > 0
    ) {
      const sub = await stripe.subscriptions.create({
        customer: customer.id,
        items: subscriptionItems,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: { purpose: 'adoption' },
      });
      subscriptionId = sub.id;
    }

    // Create sponsorship row (operations or adoption)
    // For operations donate-only, we can skip linking to language_adoptions
    if (purpose === 'adoption') {
      // One sponsorship per request, associated to the first selection; you can split per-language later via allocations
      const primaryAdoptionId = adoptionIds[0];
      await supabase.from('sponsorships').insert({
        partner_org_id: null, // to be linked later when the donor creates/joins a partner org
        language_adoption_id: primaryAdoptionId,
        status: mode === 'bank_transfer' ? 'pledged' : 'active',
        pledge_one_time_cents: depositTotal,
        pledge_recurring_cents: subscriptionItems.reduce(
          (s, i) => s + (i.price_data?.unit_amount ?? 0),
          0
        ),
        currency_code: 'USD',
        stripe_customer_id: customer.id,
        stripe_payment_intent_id: paymentIntentClientSecret ? 'created' : null,
        stripe_subscription_id: subscriptionId,
        created_by: null,
      });
    } else {
      // operations
      if (oneTimeAmount) {
        await supabase.from('sponsorships').insert({
          partner_org_id: null,
          project_id: null,
          status: mode === 'bank_transfer' ? 'pledged' : 'active',
          pledge_one_time_cents: oneTimeAmount,
          pledge_recurring_cents: 0,
          currency_code: 'USD',
          stripe_customer_id: customer.id,
          stripe_payment_intent_id: paymentIntentClientSecret
            ? 'created'
            : null,
          stripe_subscription_id: null,
          created_by: null,
        });
      }
    }

    // Bank transfer (customer balance) is not fully implemented here; client should show instructions
    return createSuccessResponse({
      customerId: customer.id,
      depositClientSecret: paymentIntentClientSecret,
      subscriptionId,
      adoptionSummaries,
    });
  } catch (e) {
    return createErrorResponse((e as Error).message, 500);
  }
});
