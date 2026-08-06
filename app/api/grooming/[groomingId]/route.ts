import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {fail, ok} from '@/lib/http';
import {groomingInputSchema, type Grooming} from '@/lib/daily-care';

// Either mark the task done today (advances next_due via the generated column,
// mirroring how mark_treatment_done advances a treatment) or edit its fields.
const patchSchema = z.union([z.object({markDone: z.literal(true)}), groomingInputSchema]);

export async function PATCH(req: Request, {params}: {params: Promise<{groomingId: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {groomingId} = await params;
    if (!z.string().uuid().safeParse(groomingId).success) return fail('invalid_id', 'Invalid task');
    const body = patchSchema.parse(await req.json());
    const patch =
      'markDone' in body
        ? {last_done: new Date().toISOString().slice(0, 10)}
        : {task: body.task, label: body.label || null, frequency_days: body.frequencyDays, last_done: body.lastDone ?? null, notes: body.notes || null};
    const {data, error} = await session.client.from('grooming_schedule').update(patch).eq('id', groomingId).select('*').single();
    if (error || !data) return fail('not_found', 'Grooming task not found', 404);
    return ok({grooming: data as Grooming});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

export async function DELETE(_req: Request, {params}: {params: Promise<{groomingId: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {groomingId} = await params;
    if (!z.string().uuid().safeParse(groomingId).success) return fail('invalid_id', 'Invalid task');
    const {error} = await session.client.from('grooming_schedule').delete().eq('id', groomingId);
    if (error) return fail('save_failed', error.message, 400);
    return ok({deleted: true});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
