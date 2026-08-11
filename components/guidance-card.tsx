'use client';
import {useEffect, useState} from 'react';
import {ContentDisclaimer} from './content-disclaimer';

type Card = {kind: 'coaching' | 'vet_redirect'; headline: string; body: string; focus: string[]};

// The flagship personalised guidance card. Reads as a handwritten advisory note
// in the passport system. Premium + life-stage-eligible pets only (gated by the
// caller). A health concern in the pet's notes returns the vet-redirect variant.
export function GuidanceCard({petId, petName, preview}: {petId: string; petName: string; preview?: Card}) {
  const [card, setCard] = useState<Card | null>(preview || null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>(preview ? 'ready' : 'loading');

  useEffect(() => {
    if (preview) return;
    let live = true;
    (async () => {
      try {
        const r = await fetch(`/api/pets/${petId}/guidance`);
        if (!live) return;
        if (!r.ok) {
          setState('unavailable');
          return;
        }
        const j = await r.json();
        setCard(j.card as Card);
        setState('ready');
      } catch {
        if (live) setState('unavailable');
      }
    })();
    return () => {
      live = false;
    };
  }, [petId, preview]);

  if (state === 'unavailable') {
    return (
      <section className="card mt-6 border-l-2 border-[var(--brass)] p-6">
        <p className="rule-label">This week for {petName}</p>
        <p className="muted mt-3 text-sm">Personalised weekly guidance will appear here once it&apos;s generated for {petName} — it adapts to species, life stage and {petName}&apos;s own recent habits.</p>
      </section>
    );
  }

  if (state === 'loading' || !card) {
    return (
      <section className="card mt-6 border-l-2 border-[var(--brass)] p-6">
        <p className="rule-label">This week for {petName}</p>
        <p className="muted mt-3 animate-pulse text-sm">Reading {petName}&apos;s week…</p>
      </section>
    );
  }

  const vet = card.kind === 'vet_redirect';
  return (
    <section className={`card mt-6 border-l-2 p-6 ${vet ? 'border-[var(--coral)]' : 'border-[var(--brass)]'}`}>
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-lg">{vet ? '⚕' : '✎'}</span>
        <p className="rule-label" style={vet ? {color: 'var(--coral)'} : undefined}>{vet ? `A note about ${petName}` : `This week for ${petName}`}</p>
      </div>
      <h3 className="mt-3 text-2xl">{card.headline}</h3>
      <p className="muted mt-2 leading-[1.7]">{card.body}</p>
      {card.focus.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {card.focus.map((f, i) => (
            <li key={i} className={`chip ${vet ? 'overdue' : ''}`}>{f}</li>
          ))}
        </ul>
      )}
      <ContentDisclaimer className="mt-5" />
    </section>
  );
}
