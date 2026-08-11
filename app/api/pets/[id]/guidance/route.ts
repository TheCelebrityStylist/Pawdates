import {createHash} from 'node:crypto';
import {z} from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import {sessionProfile} from '@/lib/access';
import {fail, ok} from '@/lib/http';
import {ownerOfPet} from '@/lib/household';
import {isPremium} from '@/lib/premium';
import {guidanceEnv} from '@/lib/env';
import {ageDays, ageLabelFor, lifeStageFor} from '@/lib/life-stage';
import {
  GUIDANCE_MODEL, GUIDANCE_SYSTEM_PROMPT, buildGuidanceUserPrompt, guidanceCardZod,
  guidanceOutputSchema, screenForHealthConcern, vetRedirectCard, weekStart,
  type GuidanceProfile,
} from '@/lib/guidance';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

// Weekly, Premium-gated, personalised guidance card. Cached one-per-pet-per-week
// so a page view never re-bills the model. A hard health pre-check short-circuits
// to a fixed "see your vet" card before any model call. Every card is stored with
// prompt/response hashes for later audit.
export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const session = await sessionProfile();
    if (!session) return fail('unauthorized', 'Sign in required', 401);
    const {id} = await params;
    if (!z.string().uuid().safeParse(id).success) return fail('invalid_id', 'Invalid pet');
    if (!isPremium(session.profile)) return fail('premium_required', 'AI guidance is a Premium feature', 402);

    const ownerId = await ownerOfPet(session.client, id);
    if (!ownerId) return fail('not_found', 'Pet not found', 404);

    const {data: pet} = await session.client.from('pets').select('id,name,species,birth_date,coat_type').eq('id', id).maybeSingle();
    if (!pet) return fail('not_found', 'Pet not found', 404);

    const period = weekStart();

    // Serve a cached card for this week if we already made one.
    const {data: cached} = await session.client.from('pet_guidance').select('*').eq('pet_id', id).eq('period_start', period).maybeSingle();
    if (cached) return ok({card: {kind: cached.kind, headline: cached.headline, body: cached.body, focus: cached.focus}, cached: true});

    // Gather the structured record.
    const [obsRes, traitsRpc, feedRes, routineRes, socDoneRes, socTotalRes, modeRes] = await Promise.all([
      session.client.from('observation_log').select('tag,note,created_at').eq('pet_id', id).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()).order('created_at', {ascending: false}).limit(40),
      session.client.rpc('compute_pet_traits', {p_pet: id}),
      session.client.from('feeding_log').select('fed_for_date').eq('pet_id', id).gte('fed_for_date', new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10)),
      session.client.from('puppy_routine_log').select('done_for_date').eq('pet_id', id).gte('done_for_date', new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10)),
      session.client.from('socialization_progress').select('id', {count: 'exact', head: true}).eq('pet_id', id),
      session.client.from('socialization_experiences').select('id', {count: 'exact', head: true}),
      session.client.from('puppy_mode').select('new_to_household,stage').eq('pet_id', id).maybeSingle(),
    ]);
    void traitsRpc;
    const obs = (obsRes.data || []) as {tag: string; note: string | null}[];

    // ── HARD guardrail: any health signal → fixed vet redirect, no model call ──
    const reason = screenForHealthConcern({
      tags: obs.map((o) => o.tag),
      notes: obs.map((o) => o.note || '').filter(Boolean),
    });
    if (reason) {
      const card = vetRedirectCard(pet.name, reason);
      await session.client.from('pet_guidance').upsert({
        pet_id: id, user_id: ownerId, period: 'week', period_start: period, kind: 'vet_redirect',
        headline: card.headline, body: card.body, focus: card.focus, blocked_reason: reason,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      }, {onConflict: 'pet_id,period_start'});
      return ok({card, cached: false});
    }

    // Read the freshly computed traits.
    const {data: traits} = await session.client.from('pet_traits').select('energy_level,sociability,routine_consistency,summary').eq('pet_id', id).maybeSingle();
    const days = ageDays(pet.birth_date);
    const newToHousehold = !!modeRes.data?.new_to_household;
    const stage = (modeRes.data?.stage as string) || lifeStageFor(pet.species, days) || (newToHousehold ? 'new to the household' : 'adult');
    const adherenceDays = new Set([...(feedRes.data || []).map((r) => r.fed_for_date), ...(routineRes.data || []).map((r) => r.done_for_date)]).size;
    const socTotal = socTotalRes.count || 0;

    const profile: GuidanceProfile = {
      name: pet.name, species: pet.species, stage, ageLabel: ageLabelFor(days), coat: pet.coat_type || null,
      traits: {energy: traits?.energy_level || null, routine: traits?.routine_consistency || null, sociability: traits?.sociability || null, summary: traits?.summary || null},
      routineAdherenceDays: adherenceDays,
      socialisation: socTotal ? {done: socDoneRes.count || 0, total: socTotal} : null,
      cleanNotes: obs.map((o) => o.note || '').filter(Boolean).slice(0, 5),
    };

    // Model call (skipped cleanly when no key is configured).
    const env = guidanceEnv();
    if (!env) return fail('guidance_unavailable', 'AI guidance is not configured on this deployment', 503);

    const userPrompt = buildGuidanceUserPrompt(profile);
    const anthropic = new Anthropic({apiKey: env.ANTHROPIC_API_KEY});
    let parsed;
    try {
      // Cast params/result to `any`: the SDK's static types lag `output_config`
      // (effort + structured-output format) and adaptive `thinking`.
      const create = anthropic.messages.create.bind(anthropic.messages) as (p: unknown) => Promise<{stop_reason?: string; content: {type: string; text?: string}[]}>;
      const msg = await create({
        model: GUIDANCE_MODEL,
        max_tokens: 2000,
        thinking: {type: 'adaptive'},
        output_config: {effort: 'low', format: {type: 'json_schema', schema: guidanceOutputSchema}},
        system: GUIDANCE_SYSTEM_PROMPT,
        messages: [{role: 'user', content: userPrompt}],
      });
      if (msg.stop_reason === 'refusal') return fail('guidance_unavailable', 'Guidance could not be generated right now', 503);
      const text = msg.content.find((b) => b.type === 'text')?.text || '';
      parsed = guidanceCardZod.parse(JSON.parse(text));
    } catch (e) {
      return fail('guidance_unavailable', e instanceof Error ? e.message : 'Guidance could not be generated', 503);
    }

    await session.client.from('pet_guidance').upsert({
      pet_id: id, user_id: ownerId, period: 'week', period_start: period, kind: 'coaching',
      headline: parsed.headline, body: parsed.body, focus: parsed.focus,
      model: GUIDANCE_MODEL, prompt_sha256: sha(GUIDANCE_SYSTEM_PROMPT + '\n' + userPrompt),
      response_sha256: sha(JSON.stringify(parsed)),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    }, {onConflict: 'pet_id,period_start'});

    return ok({card: {kind: 'coaching', ...parsed}, cached: false});
  } catch (e) {
    return fail('invalid_request', e instanceof Error ? e.message : 'Invalid request', 400);
  }
}
