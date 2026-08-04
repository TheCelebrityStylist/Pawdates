import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {fail, ok} from '@/lib/http';
import {ownerOfPet} from '@/lib/household';
import {emergencyInputSchema, type EmergencyInfo} from '@/lib/life-admin';

export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const {data, error} = await session.client.from('emergency_info').select('*').eq('pet_id', id).maybeSingle();
    if (error) return fail('query_failed', error.message, 500);
    return ok({emergency: (data || null) as EmergencyInfo | null});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

// One record per pet — upsert on pet_id.
export async function PUT(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const body = emergencyInputSchema.parse(await req.json());
    const ownerId = await ownerOfPet(session.client, id);
    if (!ownerId) return fail('not_found', 'Pet not found', 404);
    const {data, error} = await session.client
      .from('emergency_info')
      .upsert(
        {
          pet_id: id,
          user_id: ownerId,
          emergency_contact_name: body.emergencyContactName || null,
          emergency_contact_phone: body.emergencyContactPhone || null,
          vet_name: body.vetName || null,
          vet_phone: body.vetPhone || null,
          care_instructions: body.careInstructions || null,
          updated_at: new Date().toISOString(),
        },
        {onConflict: 'pet_id'},
      )
      .select('*')
      .single();
    if (error || !data) return fail('save_failed', error?.message || 'Could not save', 500);
    return ok({emergency: data as EmergencyInfo});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
