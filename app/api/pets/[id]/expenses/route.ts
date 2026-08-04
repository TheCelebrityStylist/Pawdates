import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {fail, ok} from '@/lib/http';
import {ownerOfPet} from '@/lib/household';
import {expenseInputSchema, type Expense} from '@/lib/daily-care';

export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const {data, error} = await session.client.from('expenses').select('*').eq('pet_id', id).order('spent_on', {ascending: false});
    if (error) return fail('query_failed', error.message, 500);
    return ok({expenses: (data || []) as Expense[]});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const body = expenseInputSchema.parse(await req.json());
    const ownerId = await ownerOfPet(session.client, id);
    if (!ownerId) return fail('not_found', 'Pet not found', 404);
    const {data, error} = await session.client
      .from('expenses')
      .insert({
        pet_id: id,
        user_id: ownerId,
        category: body.category,
        amount_cents: Math.round(body.amount * 100),
        currency: body.currency,
        spent_on: body.spentOn,
        notes: body.notes || null,
      })
      .select('*')
      .single();
    if (error || !data) return fail('save_failed', error?.message || 'Could not save expense', 500);
    return ok({expense: data as Expense}, 201);
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
