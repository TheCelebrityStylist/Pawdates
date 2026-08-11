// Species-aware life-stage detection, generalised from the dog-only puppy bands.
// Thresholds are approximate species norms; they only choose which reference
// routine to seed and how to frame guidance, so exactness isn't safety-critical.
export type LifeStage = 'young' | 'adolescent' | 'adult' | 'senior';
export const lifeStages: LifeStage[] = ['young', 'adolescent', 'adult', 'senior'];

export const stageLabel: Record<LifeStage, string> = {
  young: 'Young', adolescent: 'Adolescent', adult: 'Adult', senior: 'Senior',
};

// days thresholds: [end-of-young, end-of-adolescent, end-of-adult]
const THRESHOLDS: Record<string, [number, number, number]> = {
  dog: [182, 547, 2920],     // ~6mo, ~18mo, ~8yr
  cat: [182, 730, 4015],     // ~6mo, ~2yr, ~11yr
  rabbit: [182, 365, 1825],  // ~6mo, ~1yr, ~5yr
};

export function ageDays(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const d = Math.floor((Date.now() - new Date(`${birthDate}T00:00:00`).getTime()) / 86400000);
  return d >= 0 ? d : null;
}

// Returns the life stage, or null when age is unknown (rescue with no birthday).
export function lifeStageFor(species: string, days: number | null): LifeStage | null {
  if (days === null) return null;
  const t = THRESHOLDS[species] || THRESHOLDS.dog;
  if (days < t[0]) return 'young';
  if (days < t[1]) return 'adolescent';
  if (days < t[2]) return 'adult';
  return 'senior';
}

// Whether the life-stage view should be offered/auto-shown: young pets of any
// species, or a manually flagged new-to-household pet of unknown age.
export function lifeStageEligible(species: string, days: number | null, newToHousehold = false): boolean {
  if (newToHousehold) return true;
  const s = lifeStageFor(species, days);
  return s === 'young' || s === 'adolescent';
}

export function ageLabelFor(days: number | null): string | null {
  if (days === null) return null;
  if (days < 84) return `${Math.floor(days / 7)} weeks old`;
  if (days < 365) return `${Math.max(1, Math.floor(days / 30.4))} months old`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? '' : 's'} old`;
}
