import {z} from 'zod';

// ── Age bands ────────────────────────────────────────────────────────────────
// Four bands, matching the seeded routine templates. Grounded in AKC puppy
// schedule guidance (meal counts, potty cadence, sleep) and the AVSAB
// socialization window (3–14 weeks).
export const puppyBands = ['8_10w', '10_12w', '12_16w', '16_24w'] as const;
export type PuppyBand = (typeof puppyBands)[number];

export const bandLabel: Record<PuppyBand, string> = {
  '8_10w': '8–10 weeks',
  '10_12w': '10–12 weeks',
  '12_16w': '12–16 weeks',
  '16_24w': '16–24 weeks',
};

export const bandBlurb: Record<PuppyBand, string> = {
  '8_10w': 'Settling in: tiny bladder, four meals a day, sleeping 18–20 hours, gentle first socialization.',
  '10_12w': 'Building habits: still four meals, potty every 1.5–2 hours, first-vaccine outings begin.',
  '12_16w': 'Out in the world: down to three meals, walks start once fully vaccinated, the socialization window is closing.',
  '16_24w': 'Adolescence begins: three meals easing to two, longer walks, impulse control and independence.',
};

// Days-of-age → band. Puppy age in weeks: <10 → 8_10w, 10–12 → 10_12w,
// 12–16 → 12_16w, 16–24 → 16_24w. Returns null outside the puppy range.
export function bandForAgeDays(days: number): PuppyBand | null {
  if (days < 0) return null;
  const weeks = days / 7;
  if (weeks < 10) return '8_10w';
  if (weeks < 12) return '10_12w';
  if (weeks < 16) return '12_16w';
  if (weeks <= 24) return '16_24w';
  return null;
}

export function ageInDays(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const d = Math.floor((Date.now() - new Date(`${birthDate}T00:00:00`).getTime()) / 86400000);
  return d >= 0 ? d : null;
}

// Auto-suggest puppy mode for a young pet. We suggest a little past the strict
// 24-week band (up to ~9 months) so late-starting owners still get prompted,
// clamping the seed band to the oldest one.
export function suggestedBand(birthDate: string | null | undefined): PuppyBand | null {
  const days = ageInDays(birthDate);
  if (days === null) return null;
  const band = bandForAgeDays(days);
  if (band) return band;
  if (days / 7 <= 39) return '16_24w'; // 24–39 weeks: still worth the tracker
  return null;
}

// ── Activity presentation ────────────────────────────────────────────────────
export const activityGlyph: Record<string, string> = {
  potty: '🐾', feeding: '🍽', nap: '💤', play: '🎾', training: '🎓',
  socialization: '👋', chew: '🦴', walk: '🚶', grooming: '🛁', handling: '✋', settle: '🌙',
};
export const activityLabel: Record<string, string> = {
  potty: 'Potty', feeding: 'Feeding', nap: 'Nap', play: 'Play', training: 'Training',
  socialization: 'Socialization', chew: 'Chew', walk: 'Walk', grooming: 'Grooming', handling: 'Handling', settle: 'Settle',
};

// ── Socialization categories (display order + labels) ────────────────────────
export const socialCategories = ['people', 'animals', 'places', 'sounds', 'handling', 'objects', 'travel'] as const;
export type SocialCategory = (typeof socialCategories)[number];
export const socialCategoryLabel: Record<SocialCategory, string> = {
  people: 'People', animals: 'Animals', places: 'Places & surfaces', sounds: 'Sounds',
  handling: 'Handling & grooming', objects: 'Objects & sights', travel: 'Travel',
};

// ── Types ────────────────────────────────────────────────────────────────────
export type PuppyMode = {pet_id: string; user_id: string; enabled: boolean; band: PuppyBand; created_at: string; updated_at: string};
export type RoutineTemplate = {id: string; age_band: PuppyBand; sort_order: number; time_slot: string; activity_type: string; label: string; detail: string | null};
export type RoutineItem = {id: string; pet_id: string; user_id: string; source_template_id: string | null; sort_order: number; time_slot: string; activity_type: string; label: string; detail: string | null; active: boolean; created_at: string};
export type RoutineLogRow = {id: string; item_id: string; pet_id: string; done_for_date: string; done_by: string; done_at: string};
export type SocialExperience = {id: string; category: string; sort_order: number; label: string};
export type SocialProgressRow = {id: string; pet_id: string; experience_id: string; completed_at: string; completed_by: string | null; note: string | null; photo_path: string | null};

// ── Input schemas ────────────────────────────────────────────────────────────
export const activateSchema = z.object({band: z.enum(puppyBands), enabled: z.boolean().optional()});
export const routineDoneSchema = z.object({itemId: z.string().uuid()});
export const socialToggleSchema = z.object({experienceId: z.string().min(1).max(80), note: z.string().trim().max(300).optional()});
