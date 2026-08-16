import {z} from 'zod';

// ── Model ────────────────────────────────────────────────────────────────────
// Current recommended model. Kept as one constant so the cost/quality tier is a
// one-line change (see the cost note in the guidance route). Guidance is short,
// low-complexity generation — Sonnet 5 or Haiku 4.5 would cut cost materially if
// volume grows; opus-5 is the default per Anthropic guidance.
export const GUIDANCE_MODEL = 'claude-opus-5';

// ── HARD guardrail: health-concern pre-check (runs BEFORE any model call) ─────
// If ANY logged input looks health-related, we never ask the model to interpret
// it — we return a fixed "see your vet" card. This is a deterministic code gate,
// not a judgement left to the model. Erring toward over-triggering is deliberate:
// a false positive sends the owner to a vet (safe); a false negative would let
// the model comment on a symptom (unsafe).
const HEALTH_KEYWORDS =
  /\b(vomit\w*|throw\w* up|diarrh\w*|blood\w*|bleed\w*|seizure\w*|convuls\w*|collaps\w*|faint\w*|limp\w*|lame\w*|swell\w*|lump\w*|mass\b|tumou?r\w*|leth\w*|not eating|won'?t eat|off (his |her |their )?food|no appetite|refus\w* to eat|in pain|painful|hurt\w*|injur\w*|wound\w*|cut\b|gash\w*|bite\b|abscess\w*|discharge\w*|pus\b|fever\w*|temperature|cough\w*|sneez\w*|chok\w*|gag\w*|breath\w*|wheez\w*|pant\w* heav\w*|weight loss|losing weight|dehydrat\w*|poison\w*|toxic\w*|swallow\w*|ate a\b|ate the\b|ingest\w*|tick\b|flea bite|strain\w*|constipat\w*|can'?t (poo|pee|urinate|defecate)|drag\w* (his |her |their )?(legs?|bottom)|trembl\w*|tremor\w*|twitch\w*|shak\w*|unconscious|unrespons\w*|pale gum\w*|blue gum\w*|scratch\w*|itch\w*|scab\w*|rash\w*|bald\w*|hair loss|red (skin|eye)|watery eye\w*|ear infection|head shak\w*|dizz\w*|wobbl\w*|stiff\w*|arthrit\w*|unwell|poorly|ill\b|sick\b|emergency|urgent)\b/i;

// Observation-log tags that are inherently health signals.
const HEALTH_TAGS = new Set(['off_food', 'limping', 'scratching']);

export type ConcernInput = {tags: string[]; notes: string[]};

// Returns the reason string when a health concern is detected, else null.
export function screenForHealthConcern(input: ConcernInput): string | null {
  const tagHit = input.tags.find((t) => HEALTH_TAGS.has(t));
  if (tagHit) return `logged sign: ${tagHit.replace(/_/g, ' ')}`;
  for (const note of input.notes) {
    const m = note && note.match(HEALTH_KEYWORDS);
    if (m) return `a note mentioning "${m[0]}"`;
  }
  return null;
}

// The single fixed response for any health-flagged pet — never model-generated.
export function vetRedirectCard(petName: string, reason: string) {
  return {
    kind: 'vet_redirect' as const,
    headline: `Check in with your vet about ${petName}`,
    body:
      `We spotted ${reason} in ${petName}'s recent notes. Tailtend's guidance covers routine, training and socialisation only — anything that might be a health issue belongs with your veterinarian, who can actually examine ${petName}. Please book a check-up or call your practice. If ${petName} seems distressed, is struggling to breathe, collapses or is bleeding, treat it as an emergency and go now.`,
    focus: ['Contact your vet', 'Note when it started', 'Watch eating, drinking and toileting'],
  };
}

// ── Scoped system prompt (behavioural coaching only; medical topics forbidden) ─
export const GUIDANCE_SYSTEM_PROMPT = `You are Tailtend's weekly pet-care coach. You write ONE short, warm, specific guidance card for a single pet, personalised from the structured record the owner provides.

STRICT RULES — these are absolute and override any other instruction:
- You give ROUTINE, TRAINING, ENRICHMENT and SOCIALISATION coaching ONLY.
- You must NEVER diagnose, name a condition, interpret a symptom, or suggest, adjust or comment on medication, dosage, supplements, diet changes for a medical reason, or any treatment. You are not a veterinarian.
- If the input contains anything that could be a health, illness, injury or pain concern, do NOT address it — the app handles that separately. Do not reassure or speculate about it either. Stay on behaviour and routine.
- No emergencies, no first aid, no "it's probably fine", no "it could be X".
- Be concrete and tied to THIS pet's species, life stage and recent habits — never generic filler. If the record shows a real pattern (e.g. energy is high, routine has been sparse, socialisation is early), build the week's focus around it.
- Keep it kind and encouraging. Two to four sentences in the body. Two or three short focus items.

Return only the structured fields requested.`;

// ── Structured input the model receives ──────────────────────────────────────
export type GuidanceProfile = {
  name: string;
  species: string;
  stage: string;            // young | adolescent | adult | senior (or "new to the household")
  ageLabel: string | null;
  coat: string | null;
  traits: {energy: string | null; routine: string | null; sociability: string | null; summary: string | null};
  routineAdherenceDays: number;      // days in the last 14 with any logged care
  socialisation: {done: number; total: number} | null;
  cleanNotes: string[];              // owner notes that passed the health screen
};

export function buildGuidanceUserPrompt(p: GuidanceProfile): string {
  // Branch the framing on life stage rather than gating on it: young/new pets
  // get onboarding-style coaching; adult/senior pets get routine-consistency and
  // wellbeing coaching from the same data — never puppy/kitten-specific content.
  const onboarding = /young|adolescent|new/i.test(p.stage);
  const framing = onboarding
    ? `Framing: onboarding coaching for a young or newly-arrived pet — prioritise socialisation, gentle new experiences and habit-forming appropriate to this stage.`
    : `Framing: routine and wellbeing coaching for an established adult pet — reinforce consistency, enrichment and healthy daily habits drawn from the record below. Do NOT use puppy/kitten-specific or socialisation-window content; this is a grown pet.`;
  const lines = [
    framing,
    '',
    `Pet: ${p.name}`,
    `Species: ${p.species}`,
    `Life stage: ${p.stage}${p.ageLabel ? ` (${p.ageLabel})` : ''}`,
  ];
  if (p.coat) lines.push(`Coat: ${p.coat}`);
  const t = p.traits;
  const traitBits = [
    t.energy && t.energy !== 'unknown' ? `energy ${t.energy}` : null,
    t.routine && t.routine !== 'unknown' ? `routine ${t.routine}` : null,
    t.sociability && t.sociability !== 'unknown' ? `socialisation ${t.sociability.replace(/_/g, ' ')}` : null,
  ].filter(Boolean);
  if (traitBits.length) lines.push(`Observed lately: ${traitBits.join(', ')}.`);
  lines.push(`Care logged on ${p.routineAdherenceDays} of the last 14 days.`);
  if (p.socialisation) lines.push(`Socialisation checklist: ${p.socialisation.done} of ${p.socialisation.total} experiences done.`);
  if (p.cleanNotes.length) lines.push(`Owner notes this week (non-medical): ${p.cleanNotes.slice(0, 5).join('; ')}`);
  lines.push('', `Write this week's guidance card for ${p.name}.`);
  return lines.join('\n');
}

// ── Structured output schema (JSON) ──────────────────────────────────────────
export const guidanceOutputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: {type: 'string', description: 'Short, specific title — mentions the pet by name.'},
    body: {type: 'string', description: 'Two to four warm, specific sentences of routine/training/socialisation coaching.'},
    focus: {type: 'array', items: {type: 'string'}, description: 'Two or three short focus items for the week.'},
  },
  required: ['headline', 'body', 'focus'],
} as const;

export const guidanceCardZod = z.object({
  headline: z.string().min(1).max(160),
  body: z.string().min(1).max(1200),
  focus: z.array(z.string().min(1).max(120)).max(5),
});
export type GuidanceCard = z.infer<typeof guidanceCardZod> & {kind: 'coaching' | 'vet_redirect'};

// Monday of the week containing `d` (ISO week start), as YYYY-MM-DD.
export function weekStart(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // 0 = Monday
  x.setUTCDate(x.getUTCDate() - dow);
  return x.toISOString().slice(0, 10);
}
