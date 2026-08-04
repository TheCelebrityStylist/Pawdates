import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {fail, ok} from '@/lib/http';
import {expiryFromDays, updateShareLinkSchema, type ShareLink} from '@/lib/share-links';

// Time-limit an existing link: reset its expiry to N days from now, or clear it
// (never expires). RLS restricts this to the owning household's carers.
export async function PATCH(req: Request, {params}: {params: Promise<{linkId: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {linkId} = await params;
    if (!z.string().uuid().safeParse(linkId).success) return fail('invalid_id', 'Invalid link');
    const body = updateShareLinkSchema.parse(await req.json());
    const {data, error} = await session.client
      .from('share_links')
      .update({expires_at: expiryFromDays(body.expiresInDays)})
      .eq('id', linkId)
      .is('revoked_at', null)
      .select('*')
      .single();
    if (error || !data) return fail('not_found', 'Link not found', 404);
    return ok({link: data as ShareLink});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

// Revoke a link. Soft delete (set revoked_at) rather than a row delete so the
// view count and access history stay visible in the dashboard, and so a revoked
// link renders a clear "revoked" page instead of a bare 404.
export async function DELETE(_req: Request, {params}: {params: Promise<{linkId: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {linkId} = await params;
    if (!z.string().uuid().safeParse(linkId).success) return fail('invalid_id', 'Invalid link');
    const {data, error} = await session.client
      .from('share_links')
      .update({revoked_at: new Date().toISOString()})
      .eq('id', linkId)
      .select('*')
      .single();
    if (error || !data) return fail('not_found', 'Link not found', 404);
    return ok({link: data as ShareLink});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
