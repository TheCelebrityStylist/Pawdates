import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {fail, ok} from '@/lib/http';
import {ownerOfPet} from '@/lib/household';
import {routineDoneSchema, type RoutineLogRow} from '@/lib/puppy';

// Mark a routine item done for today. Mirrors the feeding "mark fed" flow: one
// tap, records who did it; the unique(item_id,done_for_date) index makes a
// second tap on an already-done item a no-op (returns the existing row).
export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const body = routineDoneSchema.parse(await req.json());
    const ownerId = await ownerOfPet(session.client, id);
    if (!ownerId) return fail('not_found', 'Pet not found', 404);
    const doneBy = (session.profile?.email || 'A carer').split('@')[0];
    const today = new Date().toISOString().slice(0, 10);

    const {data, error} = await session.client
      .from('puppy_routine_log')
      .insert({item_id: body.itemId, pet_id: id, user_id: ownerId, done_by: doneBy})
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') {
        const {data: existing} = await session.client.from('puppy_routine_log').select('*').eq('item_id', body.itemId).eq('done_for_date', today).maybeSingle();
        if (existing) return ok({log: existing as RoutineLogRow, alreadyDone: true});
      }
      return fail('save_failed', error.message, 400);
    }
    return ok({log: data as RoutineLogRow}, 201);
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

// Undo a routine item marked done today.
export async function DELETE(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const itemId = new URL(req.url).searchParams.get('itemId') || '';
    if (!z.string().uuid().safeParse(itemId).success) return fail('invalid_request', 'Missing item', 400);
    const today = new Date().toISOString().slice(0, 10);
    const {error} = await session.client.from('puppy_routine_log').delete().eq('item_id', itemId).eq('pet_id', id).eq('done_for_date', today);
    if (error) return fail('save_failed', error.message, 400);
    return ok({deleted: true});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
