import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {admin} from '@/lib/supabase';
import {fail, ok} from '@/lib/http';
import {expenseInputSchema, type Expense} from '@/lib/daily-care';

export async function PATCH(req: Request, {params}: {params: Promise<{expenseId: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {expenseId} = await params;
    if (!z.string().uuid().safeParse(expenseId).success) return fail('invalid_id', 'Invalid expense');
    const body = expenseInputSchema.parse(await req.json());
    const {data, error} = await session.client
      .from('expenses')
      .update({category: body.category, amount_cents: Math.round(body.amount * 100), currency: body.currency, spent_on: body.spentOn, notes: body.notes || null})
      .eq('id', expenseId)
      .select('*')
      .single();
    if (error || !data) return fail('not_found', 'Expense not found', 404);
    return ok({expense: data as Expense});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

export async function DELETE(_req: Request, {params}: {params: Promise<{expenseId: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {expenseId} = await params;
    if (!z.string().uuid().safeParse(expenseId).success) return fail('invalid_id', 'Invalid expense');
    const {data: row} = await session.client.from('expenses').select('receipt_path').eq('id', expenseId).maybeSingle();
    const {error} = await session.client.from('expenses').delete().eq('id', expenseId);
    if (error) return fail('save_failed', error.message, 400);
    if (row?.receipt_path) await admin().storage.from('pet-documents').remove([row.receipt_path]).catch(() => {});
    return ok({deleted: true});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
