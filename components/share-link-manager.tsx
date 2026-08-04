'use client';
import {useMemo, useState} from 'react';
import {PaywallSheet} from './paywall-sheet';
import {linkStatus, shareScopeDescription, shareScopeLabel, shareScopes, shareUrl, type ShareLink, type ShareScope} from '@/lib/share-links';

type Pet = {id: string; name: string};

const expiryOptions: {label: string; days: number | null}[] = [
  {label: '7 days', days: 7},
  {label: '30 days', days: 30},
  {label: '90 days', days: 90},
  {label: 'No expiry', days: null},
];

function expiryText(link: ShareLink) {
  const status = linkStatus(link);
  if (status === 'revoked') return 'Revoked';
  if (status === 'expired') return `Expired ${new Date(link.expires_at!).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}`;
  if (!link.expires_at) return 'No expiry';
  return `Expires ${new Date(link.expires_at).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}`;
}

export function ShareLinkManager({pets, initialLinks, appUrl}: {pets: Pet[]; initialLinks: ShareLink[]; appUrl: string}) {
  const [links, setLinks] = useState<ShareLink[]>(initialLinks);
  const [scope, setScope] = useState<Record<string, ShareScope>>({});
  const [expiryDays, setExpiryDays] = useState<Record<string, number | null>>({});
  const [label, setLabel] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [paywallPet, setPaywallPet] = useState<Pet | null>(null);

  const byPet = useMemo(() => {
    const map = new Map<string, ShareLink[]>();
    for (const l of links) map.set(l.pet_id, [...(map.get(l.pet_id) || []), l]);
    return map;
  }, [links]);

  async function create(pet: Pet) {
    setBusy(`create-${pet.id}`);
    setError('');
    try {
      const r = await fetch(`/api/pets/${pet.id}/share-links`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          scope: scope[pet.id] || 'sitter',
          expiresInDays: pet.id in expiryDays ? expiryDays[pet.id] : 30,
          label: (label[pet.id] || '').trim() || undefined,
        }),
      });
      if (r.status === 402) {
        setPaywallPet(pet);
        return;
      }
      const j = await r.json();
      if (r.ok && j.link) {
        setLinks((v) => [j.link as ShareLink, ...v]);
        setLabel((v) => ({...v, [pet.id]: ''}));
      } else {
        setError(j?.error?.message || 'Could not create link — try again.');
      }
    } catch {
      setError('Could not create link — check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  async function revoke(link: ShareLink) {
    if (!confirm('Revoke this link? Anyone holding it will immediately lose access. This cannot be undone.')) return;
    setBusy(`revoke-${link.id}`);
    setError('');
    try {
      const r = await fetch(`/api/share-links/${link.id}`, {method: 'DELETE'});
      const j = await r.json();
      if (r.ok && j.link) setLinks((v) => v.map((l) => (l.id === link.id ? (j.link as ShareLink) : l)));
      else setError(j?.error?.message || 'Could not revoke link — try again.');
    } catch {
      setError('Could not revoke link — check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  async function reExpire(link: ShareLink, days: number | null) {
    setBusy(`expiry-${link.id}`);
    setError('');
    try {
      const r = await fetch(`/api/share-links/${link.id}`, {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({expiresInDays: days}),
      });
      const j = await r.json();
      if (r.ok && j.link) setLinks((v) => v.map((l) => (l.id === link.id ? (j.link as ShareLink) : l)));
      else setError(j?.error?.message || 'Could not update expiry — try again.');
    } finally {
      setBusy(null);
    }
  }

  async function copy(link: ShareLink) {
    const url = shareUrl(appUrl, link.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(link.id);
      setTimeout(() => setCopied((c) => (c === link.id ? null : c)), 1600);
    } catch {
      setError('Could not copy — select the link and copy it manually.');
    }
  }

  if (!pets.length) return <p className="mt-2 text-sm text-black/60">Add a pet to create a shareable record link.</p>;

  return (
    <div className="mt-3 space-y-6">
      {error && <p role="alert" className="text-sm" style={{color: 'var(--stamp)'}}>{error}</p>}
      {pets.map((pet) => {
        const petLinks = byPet.get(pet.id) || [];
        const activeCount = petLinks.filter((l) => linkStatus(l) === 'active').length;
        const s = scope[pet.id] || 'sitter';
        return (
          <div key={pet.id} className="border-t border-black/10 pt-4 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between">
              <span className="font-medium">{pet.name}</span>
              <span className="text-xs text-black/50">{activeCount} active link{activeCount === 1 ? '' : 's'}</span>
            </div>

            {/* Create a new scoped link */}
            <div className="mt-3 rounded-xl border border-black/10 bg-black/[.02] p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-black/60">What to share</span>
                  <select
                    className="mt-1 min-h-11 w-full rounded-lg border border-black/20 bg-white px-2"
                    value={s}
                    onChange={(e) => setScope((v) => ({...v, [pet.id]: e.target.value as ShareScope}))}
                  >
                    {shareScopes.map((sc) => (
                      <option key={sc} value={sc}>{shareScopeLabel[sc]}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-black/60">Expires</span>
                  <select
                    className="mt-1 min-h-11 w-full rounded-lg border border-black/20 bg-white px-2"
                    value={String(pet.id in expiryDays ? expiryDays[pet.id] : 30)}
                    onChange={(e) => setExpiryDays((v) => ({...v, [pet.id]: e.target.value === 'null' ? null : Number(e.target.value)}))}
                  >
                    {expiryOptions.map((o) => (
                      <option key={o.label} value={String(o.days)}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-2 text-xs text-black/55">{shareScopeDescription[s]}</p>
              <label className="mt-3 block text-sm">
                <span className="text-black/60">Label (optional — e.g. “Grandma”, “Vet clinic”)</span>
                <input
                  className="mt-1 min-h-11 w-full rounded-lg border border-black/20 bg-white px-2"
                  value={label[pet.id] || ''}
                  maxLength={80}
                  onChange={(e) => setLabel((v) => ({...v, [pet.id]: e.target.value}))}
                  placeholder="Who is this for?"
                />
              </label>
              <button
                type="button"
                className="btn mt-3"
                disabled={busy === `create-${pet.id}`}
                onClick={() => create(pet)}
              >
                {busy === `create-${pet.id}` ? 'Creating…' : 'Create link'}
              </button>
            </div>

            {/* Existing links */}
            {petLinks.length > 0 && (
              <ul className="mt-3 space-y-3">
                {petLinks.map((link) => {
                  const status = linkStatus(link);
                  const dead = status !== 'active';
                  return (
                    <li key={link.id} className={`rounded-xl border border-black/10 p-3 ${dead ? 'opacity-60' : ''}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="chip health">{shareScopeLabel[link.scope]}</span>
                        {link.label && <span className="text-sm font-medium">{link.label}</span>}
                        <span className={`chip ${status === 'active' ? '' : 'overdue'}`}>{status}</span>
                        <span className="ml-auto text-xs text-black/50">{link.view_count} view{link.view_count === 1 ? '' : 's'}</span>
                      </div>
                      {!dead && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          <span className="break-all rounded bg-black/[.04] px-2 py-1 text-black/70">{shareUrl(appUrl, link.token)}</span>
                          <button type="button" className="text-clay" onClick={() => copy(link)}>{copied === link.id ? 'Copied!' : 'Copy'}</button>
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-black/55">
                        <span>{expiryText(link)}</span>
                        {link.last_viewed_at && <span>· last opened {new Date(link.last_viewed_at).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'})}</span>}
                      </div>
                      {!dead && (
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <label className="text-xs text-black/55">
                            Re-limit
                            <select
                              className="ml-2 rounded border border-black/20 bg-white px-1 py-1 text-xs"
                              value=""
                              disabled={busy === `expiry-${link.id}`}
                              onChange={(e) => {
                                if (e.target.value === '') return;
                                reExpire(link, e.target.value === 'null' ? null : Number(e.target.value));
                                e.target.value = '';
                              }}
                            >
                              <option value="">change…</option>
                              {expiryOptions.map((o) => (
                                <option key={o.label} value={String(o.days)}>{o.label}</option>
                              ))}
                            </select>
                          </label>
                          <button type="button" className="text-sm text-clay" disabled={busy === `revoke-${link.id}`} onClick={() => revoke(link)}>
                            {busy === `revoke-${link.id}` ? 'Revoking…' : 'Revoke'}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
      {paywallPet && <PaywallSheet trigger="sitter_share" petName={paywallPet.name} onClose={() => setPaywallPet(null)} />}
    </div>
  );
}
