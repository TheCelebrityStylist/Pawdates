import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {fail, ok} from '@/lib/http';
import {ownerOfPet} from '@/lib/household';
import {weekStart} from '@/lib/guidance';

// Records that this pet's weekly recap has been shown this calendar week, so it
// surfaces at most once per pet per week (dismiss just hides the current card).
export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const ownerId = await ownerOfPet(session.client, id);
    if (!ownerId) return fail('not_found', 'Pet not found', 404);
    const {error} = await session.client.from('pet_engagement').upsert(
      {pet_id: id, user_id: ownerId, last_recap_shown_week: weekStart(), updated_at: new Date().toISOString()},
      {onConflict: 'pet_id'}
    );
    if (error) return fail('save_failed', error.message, 400);
    return ok({week: weekStart()});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
