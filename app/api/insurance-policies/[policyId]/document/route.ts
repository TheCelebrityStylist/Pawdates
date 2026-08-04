import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {admin} from '@/lib/supabase';
import {fail, ok} from '@/lib/http';

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const maxBytes = 10 * 1024 * 1024;
const extFor = (t: string) => (t === 'application/pdf' ? 'pdf' : t === 'image/png' ? 'png' : t === 'image/webp' ? 'webp' : 'jpg');

// Mint a short-lived signed URL for a stored policy document. Access is
// authorized by the RLS SELECT (household read scope) before the service-role
// client signs — the private bucket is never public.
export async function GET(_req: Request, {params}: {params: Promise<{policyId: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {policyId} = await params;
    if (!z.string().uuid().safeParse(policyId).success) return fail('invalid_id', 'Invalid policy');
    const {data: policy} = await session.client.from('insurance_policies').select('file_path').eq('id', policyId).maybeSingle();
    if (!policy?.file_path) return fail('not_found', 'No document attached', 404);
    const {data, error} = await admin().storage.from('pet-documents').createSignedUrl(policy.file_path, 60);
    if (error || !data) return fail('query_failed', error?.message || 'Could not open document', 500);
    return ok({url: data.signedUrl});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

export async function POST(req: Request, {params}: {params: Promise<{policyId: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {policyId} = await params;
    if (!z.string().uuid().safeParse(policyId).success) return fail('invalid_id', 'Invalid policy');

    const {data: existing} = await session.client.from('insurance_policies').select('file_path').eq('id', policyId).maybeSingle();
    if (!existing) return fail('not_found', 'Policy not found', 404);

    const form = await req.formData();
    const file = form.get('document');
    if (!(file instanceof File)) return fail('invalid_request', 'No document provided', 400);
    if (!allowedTypes.has(file.type)) return fail('invalid_type', 'Document must be a PDF, JPEG, PNG or WebP', 400);
    if (file.size > maxBytes) return fail('too_large', 'Document must be under 10MB', 400);

    const path = `${session.user.id}/insurance/${policyId}-${Date.now()}.${extFor(file.type)}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const {error: uploadError} = await session.client.storage.from('pet-documents').upload(path, bytes, {contentType: file.type, upsert: false});
    if (uploadError) return fail('upload_failed', uploadError.message, 400);

    // Record the path on the row (RLS enforces household write scope). If this
    // fails, the caller isn't allowed to write — clean up the orphaned object.
    const {data, error: saveError} = await session.client.from('insurance_policies').update({file_path: path, updated_at: new Date().toISOString()}).eq('id', policyId).select('id').single();
    if (saveError || !data) {
      await admin().storage.from('pet-documents').remove([path]).catch(() => {});
      return fail('save_failed', saveError?.message || 'Could not attach document', 400);
    }
    // Replace: drop the previously attached file, if any.
    if (existing.file_path && existing.file_path !== path) await admin().storage.from('pet-documents').remove([existing.file_path]).catch(() => {});
    return ok({filePath: path});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

export async function DELETE(_req: Request, {params}: {params: Promise<{policyId: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {policyId} = await params;
    if (!z.string().uuid().safeParse(policyId).success) return fail('invalid_id', 'Invalid policy');
    const {data: policy} = await session.client.from('insurance_policies').select('file_path').eq('id', policyId).maybeSingle();
    if (!policy?.file_path) return ok({deleted: true});
    const {data, error} = await session.client.from('insurance_policies').update({file_path: null, updated_at: new Date().toISOString()}).eq('id', policyId).select('id').single();
    if (error || !data) return fail('save_failed', error?.message || 'Could not remove document', 400);
    await admin().storage.from('pet-documents').remove([policy.file_path]).catch(() => {});
    return ok({deleted: true});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
