import {z} from 'zod';

// The three scopes a share link can grant. Kept deliberately small and
// human-legible — the recipient is often stressed and non-technical, and the
// owner needs to understand at a glance exactly what they're exposing.
export const shareScopes = ['sitter', 'medical', 'full'] as const;
export type ShareScope = (typeof shareScopes)[number];

export const shareScopeLabel: Record<ShareScope, string> = {
  sitter: 'Sitter view',
  medical: 'Medical only',
  full: 'Full record',
};

// One-line description shown next to each scope in the owner's create form.
export const shareScopeDescription: Record<ShareScope, string> = {
  sitter:
    'Day-to-day handover — feeding, today’s routine, next medication, vet & emergency contact, forbidden foods. No costs, no full medical history.',
  medical:
    'Clinical view — identity, owner-recorded medical history, treatment record, weight and observations. No costs, no insurance numbers.',
  full: 'Everything the sitter and medical views show, combined. House-access notes stay private unless separately shared.',
};

// What each scope is allowed to render. The recipient page reads this instead
// of hard-coding section visibility, so scope is enforced in exactly one place.
export const shareScopeReveals: Record<ShareScope, {
  identity: boolean;
  essentials: boolean;
  feeding: boolean;
  routine: boolean;
  behaviour: boolean;
  treatments: boolean;
  medicalHistory: boolean;
  weight: boolean;
  observations: boolean;
  contact: boolean;
  emergency: boolean;   // emergency contact / vet / care instructions — a sitter and a vet both need these
  insurance: boolean;   // financial life-admin — FULL scope only, never medical or sitter
  providers: boolean;   // provider directory (vet/groomer/sitter/…) — FULL scope only
}> = {
  // Emergency info is exposed in every scope on purpose: whoever holds any link
  // to a pet should be able to reach help in an emergency. Insurance and the
  // provider directory are deliberately FULL-only — a medical-only or sitter link
  // must never leak policy numbers or the household's service contacts.
  sitter: {identity: true, essentials: true, feeding: true, routine: true, behaviour: true, treatments: false, medicalHistory: false, weight: false, observations: false, contact: true, emergency: true, insurance: false, providers: false},
  medical: {identity: true, essentials: false, feeding: false, routine: false, behaviour: false, treatments: true, medicalHistory: true, weight: true, observations: true, contact: true, emergency: true, insurance: false, providers: false},
  full: {identity: true, essentials: true, feeding: true, routine: true, behaviour: true, treatments: true, medicalHistory: true, weight: true, observations: true, contact: true, emergency: true, insurance: true, providers: true},
};

export type ShareLink = {
  id: string;
  pet_id: string;
  user_id: string;
  created_by: string | null;
  token: string;
  scope: ShareScope;
  label: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
};

export type LinkStatus = 'active' | 'expired' | 'revoked';

export function linkStatus(link: Pick<ShareLink, 'revoked_at' | 'expires_at'>, now = Date.now()): LinkStatus {
  if (link.revoked_at) return 'revoked';
  if (link.expires_at && new Date(link.expires_at).getTime() <= now) return 'expired';
  return 'active';
}

export function shareUrl(appUrl: string, token: string) {
  return `${appUrl.replace(/\/$/, '')}/s/${token}`;
}

// Allowed expiry presets, in days. `null` = never expires.
export const expiryPresets = [7, 30, 90, null] as const;

export const createShareLinkSchema = z.object({
  scope: z.enum(shareScopes),
  label: z.string().trim().max(80).optional(),
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
});

export const updateShareLinkSchema = z.object({
  // null clears the expiry (never expires); a number resets it to N days from now.
  expiresInDays: z.number().int().min(1).max(365).nullable(),
});

export function expiryFromDays(days: number | null | undefined): string | null {
  if (days === null || days === undefined) return null;
  return new Date(Date.now() + days * 86400000).toISOString();
}
