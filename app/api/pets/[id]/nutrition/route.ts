import {z} from 'zod';
import {sessionProfile} from '@/lib/access';
import {fail, ok} from '@/lib/http';
import {ownerOfPet} from '@/lib/household';
import {nutritionInputSchema, type NutritionPlan} from '@/lib/daily-care';

export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const {data, error} = await session.client.from('nutrition_plans').select('*').eq('pet_id', id).maybeSingle();
    if (error) return fail('query_failed', error.message, 500);
    return ok({nutrition: (data || null) as NutritionPlan | null});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}

// One plan per pet — upsert on pet_id.
export async function PUT(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    const body = nutritionInputSchema.parse(await req.json());
    const ownerId = await ownerOfPet(session.client, id);
    if (!ownerId) return fail('not_found', 'Pet not found', 404);
    const {data, error} = await session.client
      .from('nutrition_plans')
      .upsert(
        {
          pet_id: id,
          user_id: ownerId,
          food_brand: body.foodBrand || null,
          food_type: body.foodType || null,
          portion: body.portion || null,
          meals_per_day: body.mealsPerDay ?? null,
          feeding_times: body.feedingTimes || [],
          dietary_restrictions: body.dietaryRestrictions || null,
          notes: body.notes || null,
          updated_at: new Date().toISOString(),
        },
        {onConflict: 'pet_id'},
      )
      .select('*')
      .single();
    if (error || !data) return fail('save_failed', error?.message || 'Could not save', 500);
    return ok({nutrition: data as NutritionPlan});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
