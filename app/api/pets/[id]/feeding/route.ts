import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {fail, ok} from '@/lib/http';
import {ownerOfPet} from '@/lib/household';
import {feedingInputSchema, type FeedingLog} from '@/lib/daily-care';

// Log a meal as fed today. Mirrors the treatment "mark done" flow: one tap,
// records who fed. The unique(pet_id,slot,fed_for_date) index means a second
// tap on an already-fed slot is a no-op (returns the existing row) — this is the
// household double-feeding guard, surfaced as "already fed" rather than an error.
export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const body = feedingInputSchema.parse(await req.json());
    const ownerId = await ownerOfPet(session.client, id);
    if (!ownerId) return fail('not_found', 'Pet not found', 404);
    const fedBy = (session.profile?.email || 'A carer').split('@')[0];
    const today = new Date().toISOString().slice(0, 10);

    const {data, error} = await session.client
      .from('feeding_log')
      .insert({pet_id: id, user_id: ownerId, fed_by: fedBy, meal_time_slot: body.slot, notes: body.notes || null})
      .select('*')
      .single();
    if (error) {
      // Unique violation → already fed this slot today; return the existing row.
      if (error.code === '23505') {
        const {data: existing} = await session.client.from('feeding_log').select('*').eq('pet_id', id).eq('meal_time_slot', body.slot).eq('fed_for_date', today).maybeSingle();
        if (existing) return ok({feeding: existing as FeedingLog, alreadyFed: true});
      }
      return fail('save_failed', error.message, 400);
    }
    return ok({feeding: data as FeedingLog}, 201);
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

// Undo a mis-logged feeding for a slot today.
export async function DELETE(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const slot = new URL(req.url).searchParams.get('slot') || '';
    if (!slot) return fail('invalid_request', 'Missing slot', 400);
    const today = new Date().toISOString().slice(0, 10);
    const {error} = await session.client.from('feeding_log').delete().eq('pet_id', id).eq('meal_time_slot', slot).eq('fed_for_date', today);
    if (error) return fail('save_failed', error.message, 400);
    return ok({deleted: true});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
