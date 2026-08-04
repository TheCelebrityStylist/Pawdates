'use client';
import {useState} from 'react';
import {providerTypeLabel, providerTypes, type Provider, type ProviderType} from '@/lib/life-admin';

type Draft = {type: ProviderType; name: string; phone: string; email: string; notes: string};
const emptyDraft: Draft = {type: 'vet', name: '', phone: '', email: '', notes: ''};
const toDraft = (p: Provider): Draft => ({type: p.type, name: p.name, phone: p.phone || '', email: p.email || '', notes: p.notes || ''});

function ProviderForm({draft, setDraft, onSubmit, onCancel, busy, submitLabel}: {draft: Draft; setDraft: (d: Draft) => void; onSubmit: () => void; onCancel?: () => void; busy: boolean; submitLabel: string}) {
  return (
    <div className="rounded-xl border border-black/10 bg-black/[.02] p-3">
      <label className="block text-sm">
        <span className="text-black/60">Type</span>
        <select className="mt-1 min-h-11 w-full rounded-lg border border-black/20 bg-white px-2" value={draft.type} onChange={(e) => setDraft({...draft, type: e.target.value as ProviderType})}>
          {providerTypes.map((t) => (
            <option key={t} value={t}>{providerTypeLabel[t]}</option>
          ))}
        </select>
      </label>
      <label className="mt-2 block text-sm"><span className="text-black/60">Name *</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={draft.name} onChange={(e) => setDraft({...draft, name: e.target.value})} placeholder="Practice or person" /></label>
      <label className="mt-2 block text-sm"><span className="text-black/60">Phone</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={draft.phone} onChange={(e) => setDraft({...draft, phone: e.target.value})} /></label>
      <label className="mt-2 block text-sm"><span className="text-black/60">Email</span><input type="email" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={draft.email} onChange={(e) => setDraft({...draft, email: e.target.value})} /></label>
      <label className="mt-2 block text-sm"><span className="text-black/60">Notes</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={draft.notes} onChange={(e) => setDraft({...draft, notes: e.target.value})} placeholder="Hours, address, account number…" /></label>
      <div className="mt-3 flex gap-3">
        <button type="button" className="btn" disabled={busy || !draft.name.trim()} onClick={onSubmit}>{busy ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className="text-sm text-black/60" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}

export function ProvidersSection({petId, initial}: {petId: string; initial: Provider[]}) {
  const [providers, setProviders] = useState<Provider[]>(initial);
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<Draft>(emptyDraft);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function create() {
    setBusy('add');
    setError('');
    try {
      const r = await fetch(`/api/pets/${petId}/providers`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({type: addDraft.type, name: addDraft.name, phone: addDraft.phone || undefined, email: addDraft.email || undefined, notes: addDraft.notes || undefined})});
      const j = await r.json();
      if (r.ok && j.provider) {
        setProviders((v) => [...v, j.provider].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)));
        setAddDraft(emptyDraft);
        setAdding(false);
      } else setError(j?.error?.message || 'Could not save provider.');
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit(id: string) {
    setBusy(`edit-${id}`);
    setError('');
    try {
      const r = await fetch(`/api/providers/${id}`, {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({type: editDraft.type, name: editDraft.name, phone: editDraft.phone || undefined, email: editDraft.email || undefined, notes: editDraft.notes || undefined})});
      const j = await r.json();
      if (r.ok && j.provider) {
        setProviders((v) => v.map((p) => (p.id === id ? j.provider : p)).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)));
        setEditId(null);
      } else setError(j?.error?.message || 'Could not save.');
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this provider? This cannot be undone.')) return;
    setBusy(`del-${id}`);
    setError('');
    try {
      const r = await fetch(`/api/providers/${id}`, {method: 'DELETE'});
      if (r.ok) setProviders((v) => v.filter((p) => p.id !== id));
      else setError('Could not delete.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {error && <p role="alert" className="mb-3 text-sm text-[#BE3D2A]">{error}</p>}
      <ul className="space-y-3">
        {providers.map((p) =>
          editId === p.id ? (
            <li key={p.id}><ProviderForm draft={editDraft} setDraft={setEditDraft} onSubmit={() => saveEdit(p.id)} onCancel={() => setEditId(null)} busy={busy === `edit-${p.id}`} submitLabel="Save" /></li>
          ) : (
            <li key={p.id} className="rounded-xl border border-black/10 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{p.name} <span className="ml-1 rounded-full bg-black/[.06] px-2 py-0.5 text-xs text-black/60">{providerTypeLabel[p.type]}</span></p>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm">
                    {p.phone && <a className="text-clay" href={`tel:${p.phone}`}>{p.phone}</a>}
                    {p.email && <a className="text-clay" href={`mailto:${p.email}`}>{p.email}</a>}
                  </div>
                  {p.notes && <p className="mt-1 text-sm text-black/60">{p.notes}</p>}
                </div>
                <div className="flex gap-3 text-sm">
                  <button type="button" className="text-clay" onClick={() => {setEditDraft(toDraft(p)); setEditId(p.id);}}>Edit</button>
                  <button type="button" className="text-black/50" disabled={busy === `del-${p.id}`} onClick={() => remove(p.id)}>Delete</button>
                </div>
              </div>
            </li>
          ),
        )}
      </ul>
      {adding ? (
        <div className="mt-3"><ProviderForm draft={addDraft} setDraft={setAddDraft} onSubmit={create} onCancel={() => {setAdding(false); setAddDraft(emptyDraft);}} busy={busy === 'add'} submitLabel="Add provider" /></div>
      ) : (
        <button type="button" className="mt-3 text-sm text-clay" onClick={() => setAdding(true)}>+ Add a provider</button>
      )}
    </div>
  );
}
