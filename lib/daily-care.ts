import {z} from 'zod';

// ── Expenses ─────────────────────────────────────────────────────────────────
export const expenseCategories = ['vet', 'food', 'grooming', 'insurance', 'supplies', 'other'] as const;
export type ExpenseCategory = (typeof expenseCategories)[number];
export const expenseCategoryLabel: Record<ExpenseCategory, string> = {
  vet: 'Vet', food: 'Food', grooming: 'Grooming', insurance: 'Insurance', supplies: 'Supplies', other: 'Other',
};

export type Expense = {
  id: string;
  pet_id: string;
  user_id: string;
  category: ExpenseCategory;
  amount_cents: number;
  currency: string;
  spent_on: string;
  notes: string | null;
  receipt_path: string | null;
  created_at: string;
};

export const expenseInputSchema = z.object({
  category: z.enum(expenseCategories),
  amount: z.number().nonnegative().max(1_000_000),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).transform((s) => s.toUpperCase()).default('EUR'),
  spentOn: z.string().date(),
  notes: z.string().trim().max(500).optional(),
});

export function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-IE', {style: 'currency', currency}).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

// Group a pet's expenses into a per-currency monthly total (current calendar
// month) plus a per-category breakdown. No charting — grouped totals only.
export function summariseExpenses(expenses: Expense[], now = new Date()) {
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyByCurrency: Record<string, number> = {};
  const byCategory: Record<string, {cents: number; currency: string}> = {};
  for (const e of expenses) {
    if (e.spent_on.slice(0, 7) === ym) monthlyByCurrency[e.currency] = (monthlyByCurrency[e.currency] || 0) + e.amount_cents;
    const key = `${e.category}:${e.currency}`;
    byCategory[key] = {cents: (byCategory[key]?.cents || 0) + e.amount_cents, currency: e.currency};
  }
  return {
    monthly: Object.entries(monthlyByCurrency).map(([currency, cents]) => ({currency, cents})),
    categories: Object.entries(byCategory)
      .map(([key, v]) => ({category: key.split(':')[0] as ExpenseCategory, currency: v.currency, cents: v.cents}))
      .sort((a, b) => b.cents - a.cents),
  };
}

// ── Nutrition plan (one per pet) ─────────────────────────────────────────────
export type NutritionPlan = {
  pet_id: string;
  user_id: string;
  food_brand: string | null;
  food_type: string | null;
  portion: string | null;
  meals_per_day: number | null;
  feeding_times: string[];
  dietary_restrictions: string | null;
  notes: string | null;
  updated_at: string;
};

export const nutritionInputSchema = z.object({
  foodBrand: z.string().trim().max(160).optional(),
  foodType: z.string().trim().max(120).optional(),
  portion: z.string().trim().max(120).optional(),
  mealsPerDay: z.number().int().min(0).max(12).optional(),
  feedingTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).max(12).optional(),
  dietaryRestrictions: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export function nutritionHasContent(n: NutritionPlan | null | undefined) {
  return !!n && !!(n.food_brand || n.food_type || n.portion || n.meals_per_day || (n.feeding_times && n.feeding_times.length) || n.dietary_restrictions || n.notes);
}

// ── Feeding log (per-meal, reuses the "mark done" interaction) ───────────────
export type FeedingLog = {
  id: string;
  pet_id: string;
  user_id: string;
  fed_at: string;
  fed_by: string;
  meal_time_slot: string;
  fed_for_date: string;
  notes: string | null;
  created_at: string;
};

export const feedingInputSchema = z.object({
  slot: z.string().trim().min(1).max(20),
  notes: z.string().trim().max(300).optional(),
});

// ── Grooming schedule (reuses the treatments due-date engine) ────────────────
export const groomingTasks = ['bath', 'nail_trim', 'teeth_cleaning', 'haircut', 'ear_cleaning', 'other'] as const;
export type GroomingTask = (typeof groomingTasks)[number];
export const groomingTaskLabel: Record<GroomingTask, string> = {
  bath: 'Bath', nail_trim: 'Nail trim', teeth_cleaning: 'Teeth cleaning', haircut: 'Haircut', ear_cleaning: 'Ear cleaning', other: 'Other',
};

export type Grooming = {
  id: string;
  pet_id: string;
  user_id: string;
  task: GroomingTask;
  label: string | null;
  frequency_days: number;
  last_done: string | null;
  next_due: string | null;
  notes: string | null;
  created_at: string;
};

export const groomingInputSchema = z.object({
  task: z.enum(groomingTasks),
  label: z.string().trim().max(120).optional(),
  frequencyDays: z.number().int().min(1).max(1095),
  lastDone: z.string().date().nullable().optional(),
  notes: z.string().trim().max(500).optional(),
});

export function groomingName(g: Pick<Grooming, 'task' | 'label'>) {
  return g.label?.trim() || groomingTaskLabel[g.task];
}

// Same "due / overdue" language treatments use, computed from the generated next_due.
export function dueStatus(nextDue: string | null): {text: string; overdue: boolean} | null {
  if (!nextDue) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${nextDue}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return {text: `Overdue by ${Math.abs(days)} day${days === -1 ? '' : 's'}`, overdue: true};
  if (days === 0) return {text: 'Due today', overdue: false};
  if (days === 1) return {text: 'Due tomorrow', overdue: false};
  return {text: `Due in ${days} days`, overdue: false};
}
