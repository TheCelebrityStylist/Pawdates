'use client';
import {useMemo, useState} from 'react';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {
  activityGlyph, bandBlurb, bandLabel, puppyBands,
  socialCategories, socialCategoryLabel,
  type PuppyBand, type PuppyMode, type RoutineItem, type SocialExperience, type SocialProgressRow,
} from '@/lib/puppy';

type VaultPhoto = {id: string; title: string; occurred_on: string; url: string};

export function PuppyView({
  petId, petName, ageDays, suggested, initialMode, items, doneToday,
  experiences, initialProgress, adherence, vaultPhotos,
}: {
  petId: string; petName: string; ageDays: number | null; suggested: PuppyBand | null;
  initialMode: PuppyMode | null; items: RoutineItem[]; doneToday: string[];
  experiences: SocialExperience[]; initialProgress: SocialProgressRow[];
  adherence: number | null; vaultPhotos: VaultPhoto[];
}) {
  const router = useRouter();
  const enabled = !!initialMode?.enabled;
  const [band, setBand] = useState<PuppyBand>(initialMode?.band || suggested || '8_10w');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [done, setDone] = useState<Set<string>>(new Set(doneToday));
  const [progress, setProgress] = useState<Set<string>>(new Set(initialProgress.map((p) => p.experience_id)));

  const ageLabel = ageDays === null ? null : ageDays < 84 ? `${Math.floor(ageDays / 7)} weeks old` : `${Math.floor(ageDays / 30.4)} months old`;

  const byCategory = useMemo(() => {
    const map: Record<string, SocialExperience[]> = {};
    for (const e of experiences) (map[e.category] ||= []).push(e);
    return map;
  }, [experiences]);
  const socialDone = progress.size;
  const socialTotal = experiences.length;

  async function activate() {
    setBusy('activate');
    setNotice('');
    try {
      const r = await fetch(`/api/pets/${petId}/puppy`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({band})});
      if (!r.ok) throw new Error();
      router.refresh();
    } catch {
      setNotice('Could not start the tracker just now — try again.');
      setBusy(null);
    }
  }

  async function deactivate() {
    if (!confirm(`Turn off the puppy tracker for ${petName}? The routine and progress are kept — you can turn it back on any time.`)) return;
    setBusy('deactivate');
    try {
      await fetch(`/api/pets/${petId}/puppy`, {method: 'DELETE'});
      router.refresh();
    } catch {
      setBusy(null);
    }
  }

  async function toggleRoutine(item: RoutineItem) {
    const isDone = done.has(item.id);
    setBusy(item.id);
    // optimistic
    setDone((v) => {const n = new Set(v); if (isDone) n.delete(item.id); else n.add(item.id); return n;});
    try {
      if (isDone) {
        await fetch(`/api/pets/${petId}/puppy/routine?itemId=${item.id}`, {method: 'DELETE'});
      } else {
        const r = await fetch(`/api/pets/${petId}/puppy/routine`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({itemId: item.id})});
        if (!r.ok) throw new Error();
      }
    } catch {
      setDone((v) => {const n = new Set(v); if (isDone) n.add(item.id); else n.delete(item.id); return n;});
      setNotice('Could not save that — check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  async function toggleSocial(exp: SocialExperience) {
    const isDone = progress.has(exp.id);
    setBusy(exp.id);
    setProgress((v) => {const n = new Set(v); if (isDone) n.delete(exp.id); else n.add(exp.id); return n;});
    try {
      if (isDone) {
        await fetch(`/api/pets/${petId}/puppy/socialization?experienceId=${encodeURIComponent(exp.id)}`, {method: 'DELETE'});
      } else {
        const r = await fetch(`/api/pets/${petId}/puppy/socialization`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({experienceId: exp.id})});
        if (!r.ok) throw new Error();
      }
    } catch {
      setProgress((v) => {const n = new Set(v); if (isDone) n.add(exp.id); else n.delete(exp.id); return n;});
      setNotice('Could not save that — try again.');
    } finally {
      setBusy(null);
    }
  }

  // ── Activation (not yet enabled) ───────────────────────────────────────────
  if (!enabled) {
    return (
      <div>
        <p className="mono mt-8 text-[var(--ink-40)]">Puppy tracker</p>
        <h1 className="mt-1 text-4xl">{petName}&apos;s puppy days</h1>
        <p className="muted mt-3">A daily routine, a socialization checklist and a growing-up record — built on {petName}&apos;s existing record, so a co-owner or trainer with a share link sees it too.</p>
        {suggested && <p className="mono mt-4 text-[var(--brass-ink)]">{ageLabel ? `${petName} is about ${ageLabel}.` : ''} We&apos;ll start you on the {bandLabel[suggested]} routine.</p>}
        {notice && <p role="alert" className="mt-4 text-sm" style={{color: 'var(--stamp)'}}>{notice}</p>}

        <div className="card mt-6 p-6">
          <h2 className="rule-label">Choose a stage</h2>
          <p className="mt-2 text-sm text-black/60">Pick the band closest to {petName}&apos;s age — perfect for rescues with an unknown birthday. You can switch any time.</p>
          <div className="mt-4 space-y-2">
            {puppyBands.map((b) => (
              <label key={b} className={`card flex cursor-pointer items-start gap-3 p-3 ${band === b ? 'ring-2 ring-[var(--brass)]' : ''}`}>
                <input type="radio" name="band" className="mt-1" checked={band === b} onChange={() => setBand(b)} />
                <span><b>{bandLabel[b]}</b><span className="mono ml-2 text-xs text-[var(--ink-60)]">{b === suggested ? 'suggested' : ''}</span><span className="muted mt-1 block text-sm">{bandBlurb[b]}</span></span>
              </label>
            ))}
          </div>
          <button type="button" className="btn mt-5 w-full" disabled={busy === 'activate'} onClick={activate}>
            {busy === 'activate' ? 'Setting up…' : `Start ${petName}'s puppy tracker`}
          </button>
        </div>
      </div>
    );
  }

  // ── Active tracker ─────────────────────────────────────────────────────────
  const routineDone = items.filter((i) => done.has(i.id)).length;
  return (
    <div>
      <p className="mono mt-8 text-[var(--ink-40)]">Puppy tracker · {bandLabel[initialMode!.band]}</p>
      <div className="flex items-start justify-between gap-4">
        <h1 className="mt-1 text-4xl">{petName}&apos;s puppy days</h1>
        <button type="button" className="mono mt-2 shrink-0 text-xs text-[var(--ink-60)] underline" disabled={busy === 'deactivate'} onClick={deactivate}>Turn off</button>
      </div>
      <p className="muted mt-2">{bandBlurb[initialMode!.band]}</p>
      {notice && <p role="status" className="mt-4 border-l-2 border-[var(--health)] bg-[var(--card)] p-3 text-sm">{notice}</p>}

      {/* Progress summary */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="card p-4 text-center"><p className="text-3xl font-bold">{routineDone}<span className="text-[var(--ink-40)]">/{items.length}</span></p><p className="mono mt-1 text-xs text-[var(--ink-60)]">Today&apos;s routine</p></div>
        <div className="card p-4 text-center"><p className="text-3xl font-bold">{socialDone}<span className="text-[var(--ink-40)]">/{socialTotal}</span></p><p className="mono mt-1 text-xs text-[var(--ink-60)]">Socialization</p></div>
        <div className="card p-4 text-center"><p className="text-3xl font-bold">{adherence === null ? '—' : `${adherence}%`}</p><p className="mono mt-1 text-xs text-[var(--ink-60)]">Week adherence</p></div>
      </div>

      {/* Today's schedule */}
      <section className="card mt-6 p-6">
        <h2 className="rule-label">Today · {routineDone} of {items.length} done</h2>
        {items.length === 0
          ? <p className="muted mt-4 text-sm">No routine items yet. Turn the tracker off and on to re-seed the {bandLabel[initialMode!.band]} defaults.</p>
          : <ul className="mt-4 space-y-1">
              {items.map((item) => {
                const isDone = done.has(item.id);
                return (
                  <li key={item.id} className="flex items-center gap-3 border-b border-[var(--rule)] py-3 last:border-0">
                    <span className="mono w-12 shrink-0 text-xs text-[var(--ink-60)]">{item.time_slot}</span>
                    <span aria-hidden className="text-lg">{activityGlyph[item.activity_type] || '•'}</span>
                    <span className="min-w-0 flex-1"><b className={isDone ? 'line-through opacity-60' : ''}>{item.label}</b>{item.detail && <span className="muted block text-xs">{item.detail}</span>}</span>
                    {isDone
                      ? <button type="button" className="stamp shrink-0" title="Tap to undo" disabled={busy === item.id} onClick={() => toggleRoutine(item)}>Done</button>
                      : <button type="button" className="btn ghost shrink-0" disabled={busy === item.id} onClick={() => toggleRoutine(item)}>{busy === item.id ? '…' : 'Mark done'}</button>}
                  </li>
                );
              })}
            </ul>}
        <p className="mono mt-4 text-xs text-[var(--ink-40)]">Marks reset each day — a fresh routine every morning.</p>
      </section>

      {/* Socialization checklist */}
      <section className="card mt-6 p-6">
        <h2 className="rule-label">Socialization · {socialDone} of {socialTotal}</h2>
        <p className="mt-2 text-sm text-black/60">The critical window is roughly 3–14 weeks (AVSAB). Tick each experience as {petName} meets it calmly and positively.</p>
        <div className="mt-4 space-y-2">
          {socialCategories.map((cat) => {
            const list = byCategory[cat] || [];
            if (!list.length) return null;
            const catDone = list.filter((e) => progress.has(e.id)).length;
            return (
              <details key={cat} className="card p-0" open={cat === 'people'}>
                <summary className="flex cursor-pointer items-center justify-between p-3"><b>{socialCategoryLabel[cat]}</b><span className="mono text-xs text-[var(--ink-60)]">{catDone}/{list.length}</span></summary>
                <div className="flex flex-wrap gap-2 border-t border-[var(--rule)] p-3">
                  {list.map((exp) => {
                    const isDone = progress.has(exp.id);
                    return (
                      <button key={exp.id} type="button" aria-pressed={isDone} disabled={busy === exp.id}
                        onClick={() => toggleSocial(exp)}
                        className={isDone
                          ? 'stamp !rotate-0'
                          : 'chip'}
                        style={isDone ? undefined : {cursor: 'pointer'}}>
                        {isDone ? '✓ ' : ''}{exp.label}
                      </button>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* Vault: existing milestone photos under a puppy lens (not a new store) */}
      <section className="card mt-6 p-6">
        <h2 className="rule-label">Vault · {petName}&apos;s milestones</h2>
        {vaultPhotos.length === 0
          ? <p className="muted mt-4 text-sm">Milestone photos you add to {petName}&apos;s record — first walk, first vet visit, coming home — show here as a growing-up album. <a className="text-[var(--brass-ink)] underline" href="/app">Add one from the dashboard.</a></p>
          : <div className="mt-4 grid grid-cols-3 gap-2">
              {vaultPhotos.map((p) => (
                <figure key={p.id} className="passport-photo relative aspect-square">
                  <Image src={p.url} alt={p.title} fill sizes="180px" className="object-cover" />
                  <figcaption className="mrz">{p.title}</figcaption>
                </figure>
              ))}
            </div>}
        <p className="mono mt-4 text-xs text-[var(--ink-40)]">Same photos as the record — a different lens, not a second gallery.</p>
      </section>
    </div>
  );
}
