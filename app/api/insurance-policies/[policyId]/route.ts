import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {admin} from '@/lib/supabase';
import {fail, ok} from '@/lib/http';
import {insuranceInputSchema, type InsurancePolicy} from '@/lib/life-admin';

export async function PATCH(req: Request, {params}: {params: Promise<{policyId: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {policyId} = await params;
    if (!z.string().uuid().safeParse(policyId).success) return fail('invalid_id', 'Invalid policy');
    const body = insuranceInputSchema.parse(await req.json());
    const {data, error} = await session.client
      .from('insurance_policies')
      .update({
        provider: body.provider,
        policy_number: body.policyNumber || null,
        coverage_summary: body.coverageSummary || null,
        renewal_date: body.renewalDate || null,
        notes: body.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', policyId)
      .select('*')
      .single();
    if (error || !data) return fail('not_found', 'Policy not found', 404);
    return ok({policy: data as InsurancePolicy});
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
    // Read the row first (RLS-scoped) so we can clean up its stored document too.
    const {data: policy} = await session.client.from('insurance_policies').select('file_path').eq('id', policyId).maybeSingle();
    const {error} = await session.client.from('insurance_policies').delete().eq('id', policyId);
    if (error) return fail('save_failed', error.message, 400);
    if (policy?.file_path) await admin().storage.from('pet-documents').remove([policy.file_path]).catch(() => {});
    return ok({deleted: true});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
