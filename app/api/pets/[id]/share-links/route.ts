import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {fail, ok} from '@/lib/http';
import {createShareLinkSchema, expiryFromDays, type ShareLink} from '@/lib/share-links';

// List every share link for a pet (owner + household), newest first.
export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const {data, error} = await session.client
      .from('share_links')
      .select('*')
      .eq('pet_id', id)
      .order('created_at', {ascending: false});
    if (error) return fail('query_failed', error.message, 500);
    return ok({links: (data || []) as ShareLink[]});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

// Mint a new scoped, optionally-expiring share link for a pet. Sharing is a
// Premium feature (matches the existing /api/pets/[id]/share gate). RLS on
// insert enforces that the caller is the owner or a household carer.
export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    if (!session.premium) return fail('premium_required', 'Premium is required to share a record', 402);
    const body = createShareLinkSchema.parse(await req.json());

    // The link's user_id must be the pet's OWNER (the RLS scope key), not the
    // acting carer — fetch it through the caller's read scope so a non-member
    // can't create links against a pet they can't see.
    const {data: pet, error: petError} = await session.client
      .from('pets')
      .select('user_id')
      .eq('id', id)
      .single();
    if (petError || !pet) return fail('not_found', 'Pet not found', 404);

    const {data, error} = await session.client
      .from('share_links')
      .insert({
        pet_id: id,
        user_id: pet.user_id,
        created_by: session.user.id,
        scope: body.scope,
        label: body.label || null,
        expires_at: expiryFromDays(body.expiresInDays),
      })
      .select('*')
      .single();
    if (error || !data) return fail('save_failed', error?.message || 'Could not create link', 500);
    return ok({link: data as ShareLink}, 201);
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
