import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {fail, ok} from '@/lib/http';
import {ownerOfPet} from '@/lib/household';
import {socialToggleSchema, type SocialProgressRow} from '@/lib/puppy';

// Mark a socialization experience complete for this pet. Idempotent via the
// unique(pet_id,experience_id) index — a repeat tap just updates the note.
export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const body = socialToggleSchema.parse(await req.json());
    const ownerId = await ownerOfPet(session.client, id);
    if (!ownerId) return fail('not_found', 'Pet not found', 404);
    const by = (session.profile?.email || 'A carer').split('@')[0];

    const {data, error} = await session.client
      .from('socialization_progress')
      .upsert({pet_id: id, user_id: ownerId, experience_id: body.experienceId, completed_by: by, note: body.note || null, completed_at: new Date().toISOString()}, {onConflict: 'pet_id,experience_id'})
      .select('*')
      .single();
    if (error) return fail('save_failed', error.message, 400);
    return ok({progress: data as SocialProgressRow}, 201);
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

// Un-complete a socialization experience.
export async function DELETE(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const experienceId = new URL(req.url).searchParams.get('experienceId') || '';
    if (!experienceId) return fail('invalid_request', 'Missing experience', 400);
    const {error} = await session.client.from('socialization_progress').delete().eq('pet_id', id).eq('experience_id', experienceId);
    if (error) return fail('save_failed', error.message, 400);
    return ok({deleted: true});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
