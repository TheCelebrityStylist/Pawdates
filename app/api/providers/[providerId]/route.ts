import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {fail, ok} from '@/lib/http';
import {providerInputSchema, type Provider} from '@/lib/life-admin';

export async function PATCH(req: Request, {params}: {params: Promise<{providerId: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {providerId} = await params;
    if (!z.string().uuid().safeParse(providerId).success) return fail('invalid_id', 'Invalid provider');
    const body = providerInputSchema.parse(await req.json());
    const {data, error} = await session.client
      .from('providers')
      .update({type: body.type, name: body.name, phone: body.phone || null, email: body.email || null, notes: body.notes || null})
      .eq('id', providerId)
      .select('*')
      .single();
    if (error || !data) return fail('not_found', 'Provider not found', 404);
    return ok({provider: data as Provider});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

export async function DELETE(_req: Request, {params}: {params: Promise<{providerId: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {providerId} = await params;
    if (!z.string().uuid().safeParse(providerId).success) return fail('invalid_id', 'Invalid provider');
    const {error} = await session.client.from('providers').delete().eq('id', providerId);
    if (error) return fail('save_failed', error.message, 400);
    return ok({deleted: true});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
