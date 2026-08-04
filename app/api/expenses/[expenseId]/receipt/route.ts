import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {admin} from '@/lib/supabase';
import {fail, ok} from '@/lib/http';

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const maxBytes = 10 * 1024 * 1024;
const extFor = (t: string) => (t === 'application/pdf' ? 'pdf' : t === 'image/png' ? 'png' : t === 'image/webp' ? 'webp' : 'jpg');

// Signed URL for a receipt in the private pet-documents bucket, authorized via
// the RLS SELECT before signing (same pattern as insurance documents).
export async function GET(_req: Request, {params}: {params: Promise<{expenseId: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {expenseId} = await params;
    if (!z.string().uuid().safeParse(expenseId).success) return fail('invalid_id', 'Invalid expense');
    const {data: row} = await session.client.from('expenses').select('receipt_path').eq('id', expenseId).maybeSingle();
    if (!row?.receipt_path) return fail('not_found', 'No receipt attached', 404);
    const {data, error} = await admin().storage.from('pet-documents').createSignedUrl(row.receipt_path, 60);
    if (error || !data) return fail('query_failed', error?.message || 'Could not open receipt', 500);
    return ok({url: data.signedUrl});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

export async function POST(req: Request, {params}: {params: Promise<{expenseId: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {expenseId} = await params;
    if (!z.string().uuid().safeParse(expenseId).success) return fail('invalid_id', 'Invalid expense');
    const {data: existing} = await session.client.from('expenses').select('receipt_path').eq('id', expenseId).maybeSingle();
    if (!existing) return fail('not_found', 'Expense not found', 404);

    const form = await req.formData();
    const file = form.get('receipt');
    if (!(file instanceof File)) return fail('invalid_request', 'No receipt provided', 400);
    if (!allowedTypes.has(file.type)) return fail('invalid_type', 'Receipt must be a PDF, JPEG, PNG or WebP', 400);
    if (file.size > maxBytes) return fail('too_large', 'Receipt must be under 10MB', 400);

    const path = `${session.user.id}/receipts/${expenseId}-${Date.now()}.${extFor(file.type)}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const {error: uploadError} = await session.client.storage.from('pet-documents').upload(path, bytes, {contentType: file.type, upsert: false});
    if (uploadError) return fail('upload_failed', uploadError.message, 400);
    const {data, error: saveError} = await session.client.from('expenses').update({receipt_path: path}).eq('id', expenseId).select('id').single();
    if (saveError || !data) {
      await admin().storage.from('pet-documents').remove([path]).catch(() => {});
      return fail('save_failed', saveError?.message || 'Could not attach receipt', 400);
    }
    if (existing.receipt_path && existing.receipt_path !== path) await admin().storage.from('pet-documents').remove([existing.receipt_path]).catch(() => {});
    return ok({receiptPath: path});
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
    if (!row?.receipt_path) return ok({deleted: true});
    const {data, error} = await session.client.from('expenses').update({receipt_path: null}).eq('id', expenseId).select('id').single();
    if (error || !data) return fail('save_failed', error?.message || 'Could not remove receipt', 400);
    await admin().storage.from('pet-documents').remove([row.receipt_path]).catch(() => {});
    return ok({deleted: true});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
