import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {
  createCorsResponse,
  createErrorResponse,
  createSuccessResponse,
} from '../_shared/response-utils.ts';

interface LeadBody {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  source?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return createCorsResponse();
  if (req.method !== 'POST')
    return createErrorResponse('Method not allowed', 405);

  try {
    const { firstName, lastName, email, phone, source }: LeadBody =
      await req.json();
    if (!firstName || !lastName || !email) {
      return createErrorResponse('Missing required lead fields', 400);
    }

    // Non-blocking CRM call (HubSpot) - best-effort
    const hubspotKey = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
    if (hubspotKey) {
      // HubSpot CRM v3 Contacts minimal create
      const payload = {
        properties: {
          email,
          firstname: firstName,
          lastname: lastName,
          phone: phone ?? undefined,
          lifecyclestage: 'subscriber',
          source: source ?? 'everylanguage',
        },
      };
      fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hubspotKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).catch(() => void 0);
    }

    return createSuccessResponse({ ok: true });
  } catch (e) {
    return createErrorResponse((e as Error).message, 500);
  }
});
