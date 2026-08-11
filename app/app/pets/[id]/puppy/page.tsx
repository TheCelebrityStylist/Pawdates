import {notFound, redirect} from 'next/navigation';
import {sessionProfile} from '@/lib/access';
import {PuppyView} from '@/components/puppy-view';
import {ageInDays, suggestedBand, type PuppyMode, type RoutineItem, type SocialExperience, type SocialProgressRow} from '@/lib/puppy';

export async function generateMetadata({params}: {params: Promise<{id: string}>}) {
  await params;
  return {title: 'Puppy tracker', robots: {index: false, follow: false}};
}

export default async function PuppyPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const session = await sessionProfile();
  if (!session) redirect(`/app/login?next=/app/pets/${id}/puppy`);

  const {data: pet} = await session.client.from('pets').select('id,name,species,birth_date,photo_path').eq('id', id).maybeSingle();
  if (!pet) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

  // Resilient to an unapplied 0020 migration — fall back to empty everywhere.
  const [modeRes, itemsRes, todayLogRes, weekLogRes, expRes, progRes, mileRes] = await Promise.all([
    session.client.from('puppy_mode').select('*').eq('pet_id', id).maybeSingle(),
    session.client.from('puppy_routine_items').select('*').eq('pet_id', id).eq('active', true).order('sort_order'),
    session.client.from('puppy_routine_log').select('item_id').eq('pet_id', id).eq('done_for_date', today),
    session.client.from('puppy_routine_log').select('item_id,done_for_date').eq('pet_id', id).gte('done_for_date', weekAgo),
    session.client.from('socialization_experiences').select('*').order('sort_order'),
    session.client.from('socialization_progress').select('id,pet_id,experience_id,completed_at,completed_by,note,photo_path').eq('pet_id', id),
    session.client.from('milestones').select('id,title,photo_path,occurred_on').eq('pet_id', id).not('photo_path', 'is', null).order('occurred_on', {ascending: false}).limit(12),
  ]);

  const mode = (modeRes.error ? null : modeRes.data || null) as PuppyMode | null;
  const items = (itemsRes.error ? [] : itemsRes.data || []) as RoutineItem[];
  const doneToday = new Set((todayLogRes.error ? [] : todayLogRes.data || []).map((r) => r.item_id));
  const weekLog = (weekLogRes.error ? [] : weekLogRes.data || []) as {item_id: string; done_for_date: string}[];
  const experiences = (expRes.error ? [] : expRes.data || []) as SocialExperience[];
  const progress = (progRes.error ? [] : progRes.data || []) as SocialProgressRow[];
  const milestones = (mileRes.error ? [] : mileRes.data || []) as {id: string; title: string; photo_path: string; occurred_on: string}[];

  const vaultPhotos = milestones.map((m) => ({
    id: m.id, title: m.title, occurred_on: m.occurred_on,
    url: session.client.storage.from('pet-photos').getPublicUrl(m.photo_path).data.publicUrl,
  }));

  // Weekly adherence: share of active items done, across the days they were
  // logged (only counts days the tracker has been used, so a brand-new pet
  // isn't punished for days before setup).
  const activeItemCount = items.length;
  const daysWithActivity = new Set(weekLog.map((r) => r.done_for_date)).size;
  const adherence = activeItemCount && daysWithActivity
    ? Math.min(100, Math.round((weekLog.length / (activeItemCount * daysWithActivity)) * 100))
    : null;

  return (
    <main className="min-h-screen bg-paper px-5 py-10 text-[var(--ink)] [color-scheme:light]">
      <div className="mx-auto max-w-[620px]">
        <a className="mono text-[var(--brass-ink)]" href="/app">← Dashboard</a>
        <PuppyView
          petId={pet.id}
          petName={pet.name}
          ageDays={ageInDays(pet.birth_date)}
          suggested={suggestedBand(pet.birth_date)}
          initialMode={mode}
          items={items}
          doneToday={[...doneToday]}
          experiences={experiences}
          initialProgress={progress}
          adherence={adherence}
          vaultPhotos={vaultPhotos}
        />
      </div>
    </main>
  );
}
