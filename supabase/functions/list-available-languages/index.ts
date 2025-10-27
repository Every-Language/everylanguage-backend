import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';

interface PublicAdoptionRow {
  id: string;
  language_entity_id: string;
  status: 'draft' | 'available' | 'on_hold' | 'funded' | 'archived';
  estimated_budget_cents: number;
  currency_code: string;
  translators_ready: boolean;
  available_since: string | null;
  notes: string | null;
  funding_received_usd_cents: number | null;
}

interface LanguageEntityNameRow {
  id: string;
  name: string;
}

interface EnrichedAdoption {
  id: string;
  language_entity_id: string;
  language_name: string | null;
  status: PublicAdoptionRow['status'];
  estimated_budget_cents: number;
  currency_code: string;
  translators_ready: boolean;
  available_since: string | null;
  notes: string | null;
  funding_received_usd_cents: number;
}

/**
 * Public endpoint to list languages available for adoption (sponsorship).
 * Uses the public_language_adoptions view and augments with language names.
 * Accepts optional query params: status (default 'available'), limit, offset.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  if (req.method !== 'GET') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const url = new URL(req.url);
    const status = (url.searchParams.get('status') || 'available') as
      | 'draft'
      | 'available'
      | 'on_hold'
      | 'funded'
      | 'archived';
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '50', 10),
      200
    );
    const offset = Math.max(
      parseInt(url.searchParams.get('offset') || '0', 10),
      0
    );

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      // Use service role to avoid RLS complexity in view joins; data is public-safe per policy
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: adoptions, error: adoptionsErr } = await supabase
      .from('public_language_adoptions')
      .select('*')
      .eq('status', status)
      .order('available_since', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (adoptionsErr) {
      return createErrorResponse(
        `DB error (public_language_adoptions): ${adoptionsErr.message}`,
        500
      );
    }

    const typedAdoptions = (adoptions ?? []) as unknown as PublicAdoptionRow[];

    const languageIds = Array.from(
      new Set(typedAdoptions.map(a => a.language_entity_id).filter(Boolean))
    );

    let idToName: Record<string, string> = {};
    if (languageIds.length > 0) {
      const { data: langs, error: langsErr } = await supabase
        .from('language_entities')
        .select('id, name')
        .in('id', languageIds);
      if (langsErr) {
        return createErrorResponse(
          `DB error (language_entities): ${langsErr.message}`,
          500
        );
      }
      const typedLangs = (langs ?? []) as unknown as LanguageEntityNameRow[];
      idToName = Object.fromEntries(typedLangs.map(l => [l.id, l.name]));
    }

    const enriched: EnrichedAdoption[] = typedAdoptions.map(a => ({
      id: a.id,
      language_entity_id: a.language_entity_id,
      language_name: idToName[a.language_entity_id] ?? null,
      status: a.status,
      estimated_budget_cents: a.estimated_budget_cents,
      currency_code: a.currency_code,
      translators_ready: a.translators_ready,
      available_since: a.available_since,
      notes: a.notes,
      funding_received_usd_cents: a.funding_received_usd_cents ?? 0,
    }));

    return createSuccessResponse({
      items: enriched,
      count: enriched.length,
      nextOffset: offset + enriched.length,
    });
  } catch (error) {
    return createErrorResponse((error as Error).message, 500);
  }
});
