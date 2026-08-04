'use client';
import {useState} from 'react';
import type {NutritionPlan} from '@/lib/daily-care';

export function NutritionSection({petId, initial}: {petId: string; initial: NutritionPlan | null}) {
  const [foodBrand, setFoodBrand] = useState(initial?.food_brand || '');
  const [foodType, setFoodType] = useState(initial?.food_type || '');
  const [portion, setPortion] = useState(initial?.portion || '');
  const [mealsPerDay, setMealsPerDay] = useState(initial?.meals_per_day ? String(initial.meals_per_day) : '');
  const [feedingTimes, setFeedingTimes] = useState((initial?.feeding_times || []).join(', '));
  const [dietaryRestrictions, setDietaryRestrictions] = useState(initial?.dietary_restrictions || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true); setError(''); setSaved(false);
    const times = feedingTimes.split(',').map((t) => t.trim()).filter(Boolean);
    if (times.some((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))) { setError('Feeding times must be HH:MM, comma-separated (e.g. 08:00, 18:00).'); setBusy(false); return; }
    try {
      const r = await fetch(`/api/pets/${petId}/nutrition`, {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({
        foodBrand: foodBrand || undefined, foodType: foodType || undefined, portion: portion || undefined,
        mealsPerDay: mealsPerDay ? Number(mealsPerDay) : undefined, feedingTimes: times,
        dietaryRestrictions: dietaryRestrictions || undefined, notes: notes || undefined,
      })});
      if (!r.ok) throw new Error('Could not save');
      setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  }

  return (
    <div>
      {error && <p role="alert" className="mb-3 text-sm text-[#BE3D2A]">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm"><span className="text-black/60">Food brand</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={foodBrand} onChange={(e) => setFoodBrand(e.target.value)} placeholder="e.g. Royal Canin" /></label>
        <label className="block text-sm"><span className="text-black/60">Type</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={foodType} onChange={(e) => setFoodType(e.target.value)} placeholder="dry / wet / raw…" /></label>
        <label className="block text-sm"><span className="text-black/60">Portion per meal</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={portion} onChange={(e) => setPortion(e.target.value)} placeholder="e.g. 80g" /></label>
        <label className="block text-sm"><span className="text-black/60">Meals per day</span><input type="number" min="0" max="12" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={mealsPerDay} onChange={(e) => setMealsPerDay(e.target.value)} /></label>
      </div>
      <label className="mt-3 block text-sm"><span className="text-black/60">Feeding times (HH:MM, comma-separated)</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={feedingTimes} onChange={(e) => setFeedingTimes(e.target.value)} placeholder="08:00, 18:00" /></label>
      <label className="mt-3 block text-sm"><span className="text-black/60">Dietary restrictions</span><textarea rows={2} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={dietaryRestrictions} onChange={(e) => setDietaryRestrictions(e.target.value)} placeholder="Allergies, foods to avoid…" /></label>
      <label className="mt-3 block text-sm"><span className="text-black/60">Notes</span><textarea rows={2} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <button type="button" className="btn mt-4" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save nutrition plan'}</button>
      {saved && <p role="status" className="mt-3 text-sm text-black/60">Saved.</p>}
      <p className="mt-3 text-xs text-black/45">Shown on sitter and full-record share links so whoever is feeding your pet gets it right.</p>
    </div>
  );
}
