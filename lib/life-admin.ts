import {z} from 'zod';

// ── Insurance ────────────────────────────────────────────────────────────────
export type InsurancePolicy = {
  id: string;
  pet_id: string;
  user_id: string;
  provider: string;
  policy_number: string | null;
  coverage_summary: string | null;
  renewal_date: string | null;
  file_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const insuranceInputSchema = z.object({
  provider: z.string().trim().min(1).max(160),
  policyNumber: z.string().trim().max(120).optional(),
  coverageSummary: z.string().trim().max(1000).optional(),
  renewalDate: z.string().date().optional(),
  notes: z.string().trim().max(1000).optional(),
});

// ── Providers ────────────────────────────────────────────────────────────────
export const providerTypes = ['vet', 'groomer', 'sitter', 'walker', 'boarding', 'other'] as const;
export type ProviderType = (typeof providerTypes)[number];
export const providerTypeLabel: Record<ProviderType, string> = {
  vet: 'Vet',
  groomer: 'Groomer',
  sitter: 'Sitter',
  walker: 'Dog walker',
  boarding: 'Boarding / kennel',
  other: 'Other',
};

export type Provider = {
  id: string;
  pet_id: string;
  user_id: string;
  type: ProviderType;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
};

export const providerInputSchema = z.object({
  type: z.enum(providerTypes),
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(60).optional(),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional(),
});

// ── Emergency info ───────────────────────────────────────────────────────────
export type EmergencyInfo = {
  pet_id: string;
  user_id: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  vet_name: string | null;
  vet_phone: string | null;
  care_instructions: string | null;
  updated_at: string;
};

export const emergencyInputSchema = z.object({
  emergencyContactName: z.string().trim().max(160).optional(),
  emergencyContactPhone: z.string().trim().max(60).optional(),
  vetName: z.string().trim().max(160).optional(),
  vetPhone: z.string().trim().max(60).optional(),
  careInstructions: z.string().trim().max(2000).optional(),
});

export function emergencyHasContent(e: EmergencyInfo | null | undefined) {
  return !!e && !!(e.emergency_contact_name || e.emergency_contact_phone || e.vet_name || e.vet_phone || e.care_instructions);
}
