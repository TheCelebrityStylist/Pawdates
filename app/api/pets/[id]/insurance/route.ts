import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {fail, ok} from '@/lib/http';
import {ownerOfPet} from '@/lib/household';
import {insuranceInputSchema, type InsurancePolicy} from '@/lib/life-admin';

export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const {data, error} = await session.client.from('insurance_policies').select('*').eq('pet_id', id).order('created_at', {ascending: false});
    if (error) return fail('query_failed', error.message, 500);
    return ok({policies: (data || []) as InsurancePolicy[]});
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
    const body = insuranceInputSchema.parse(await req.json());
    const ownerId = await ownerOfPet(session.client, id);
    if (!ownerId) return fail('not_found', 'Pet not found', 404);
    const {data, error} = await session.client
      .from('insurance_policies')
      .insert({
        pet_id: id,
        user_id: ownerId,
        provider: body.provider,
        policy_number: body.policyNumber || null,
        coverage_summary: body.coverageSummary || null,
        renewal_date: body.renewalDate || null,
        notes: body.notes || null,
      })
      .select('*')
      .single();
    if (error || !data) return fail('save_failed', error?.message || 'Could not save policy', 500);
    return ok({policy: data as InsurancePolicy}, 201);
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
