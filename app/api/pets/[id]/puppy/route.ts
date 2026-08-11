import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {fail, ok} from '@/lib/http';
import {ownerOfPet} from '@/lib/household';
import {activateSchema, type PuppyMode, type RoutineTemplate} from '@/lib/puppy';

// Activate (or update) puppy mode for a pet and seed its daily routine from the
// chosen age band's reference templates — but only on first activation, so a
// re-activation never clobbers items the owner may have (in future) customised.
export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const body = activateSchema.parse(await req.json());
    const ownerId = await ownerOfPet(session.client, id);
    if (!ownerId) return fail('not_found', 'Pet not found', 404);

    const {data: mode, error} = await session.client
      .from('puppy_mode')
      .upsert({pet_id: id, user_id: ownerId, band: body.band, enabled: body.enabled ?? true, updated_at: new Date().toISOString()}, {onConflict: 'pet_id'})
      .select('*')
      .single();
    if (error) return fail('save_failed', error.message, 400);

    // Seed routine items once, from the band templates, if the pet has none yet.
    const {count} = await session.client.from('puppy_routine_items').select('id', {count: 'exact', head: true}).eq('pet_id', id);
    let seeded = 0;
    if (!count) {
      const {data: templates} = await session.client
        .from('puppy_routine_templates').select('*').eq('age_band', body.band).order('sort_order');
      const rows = (templates || []).map((t: RoutineTemplate) => ({
        pet_id: id, user_id: ownerId, source_template_id: t.id, sort_order: t.sort_order,
        time_slot: t.time_slot, activity_type: t.activity_type, label: t.label, detail: t.detail,
      }));
      if (rows.length) {
        const {error: insErr, count: insCount} = await session.client.from('puppy_routine_items').insert(rows, {count: 'exact'});
        if (insErr) return fail('save_failed', insErr.message, 400);
        seeded = insCount || rows.length;
      }
    }
    return ok({mode: mode as PuppyMode, seeded}, 201);
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

// Turn puppy mode off (keeps the routine items + history for later).
export async function DELETE(_req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const {error} = await session.client.from('puppy_mode').update({enabled: false, updated_at: new Date().toISOString()}).eq('pet_id', id);
    if (error) return fail('save_failed', error.message, 400);
    return ok({disabled: true});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
