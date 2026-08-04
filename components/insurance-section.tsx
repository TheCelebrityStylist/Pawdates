'use client';
import {useRef, useState} from 'react';
import type {InsurancePolicy} from '@/lib/life-admin';

type Draft = {provider: string; policyNumber: string; coverageSummary: string; renewalDate: string; notes: string};
const emptyDraft: Draft = {provider: '', policyNumber: '', coverageSummary: '', renewalDate: '', notes: ''};
const toDraft = (p: InsurancePolicy): Draft => ({
  provider: p.provider,
  policyNumber: p.policy_number || '',
  coverageSummary: p.coverage_summary || '',
  renewalDate: p.renewal_date || '',
  notes: p.notes || '',
});

function Field({label, value, onChange, type = 'text', placeholder}: {label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string}) {
  return (
    <label className="mt-2 block text-sm">
      <span className="text-black/60">{label}</span>
      <input type={type} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={value} placeholder={placeholder} max={type === 'date' ? '2999-12-31' : undefined} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function PolicyForm({draft, setDraft, onSubmit, onCancel, busy, submitLabel}: {draft: Draft; setDraft: (d: Draft) => void; onSubmit: () => void; onCancel?: () => void; busy: boolean; submitLabel: string}) {
  return (
    <div className="rounded-xl border border-black/10 bg-black/[.02] p-3">
      <Field label="Provider *" value={draft.provider} onChange={(v) => setDraft({...draft, provider: v})} placeholder="e.g. Petplan" />
      <Field label="Policy number" value={draft.policyNumber} onChange={(v) => setDraft({...draft, policyNumber: v})} />
      <label className="mt-2 block text-sm">
        <span className="text-black/60">Coverage summary</span>
        <textarea className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" rows={2} value={draft.coverageSummary} onChange={(e) => setDraft({...draft, coverageSummary: e.target.value})} placeholder="What's covered, excess, limits…" />
      </label>
      <Field label="Renewal date" type="date" value={draft.renewalDate} onChange={(v) => setDraft({...draft, renewalDate: v})} />
      <Field label="Notes" value={draft.notes} onChange={(v) => setDraft({...draft, notes: v})} />
      <div className="mt-3 flex gap-3">
        <button type="button" className="btn" disabled={busy || !draft.provider.trim()} onClick={onSubmit}>{busy ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className="text-sm text-black/60" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}

export function InsuranceSection({petId, initial}: {petId: string; initial: InsurancePolicy[]}) {
  const [policies, setPolicies] = useState<InsurancePolicy[]>(initial);
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<Draft>(emptyDraft);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function create() {
    setBusy('add');
    setError('');
    try {
      const r = await fetch(`/api/pets/${petId}/insurance`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({provider: addDraft.provider, policyNumber: addDraft.policyNumber || undefined, coverageSummary: addDraft.coverageSummary || undefined, renewalDate: addDraft.renewalDate || undefined, notes: addDraft.notes || undefined})});
      const j = await r.json();
      if (r.ok && j.policy) {
        setPolicies((v) => [j.policy, ...v]);
        setAddDraft(emptyDraft);
        setAdding(false);
      } else setError(j?.error?.message || 'Could not save policy.');
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit(id: string) {
    setBusy(`edit-${id}`);
    setError('');
    try {
      const r = await fetch(`/api/insurance-policies/${id}`, {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({provider: editDraft.provider, policyNumber: editDraft.policyNumber || undefined, coverageSummary: editDraft.coverageSummary || undefined, renewalDate: editDraft.renewalDate || undefined, notes: editDraft.notes || undefined})});
      const j = await r.json();
      if (r.ok && j.policy) {
        setPolicies((v) => v.map((p) => (p.id === id ? j.policy : p)));
        setEditId(null);
      } else setError(j?.error?.message || 'Could not save.');
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this insurance policy? This cannot be undone.')) return;
    setBusy(`del-${id}`);
    setError('');
    try {
      const r = await fetch(`/api/insurance-policies/${id}`, {method: 'DELETE'});
      if (r.ok) setPolicies((v) => v.filter((p) => p.id !== id));
      else setError('Could not delete.');
    } finally {
      setBusy(null);
    }
  }

  async function uploadDoc(id: string, file: File) {
    setBusy(`doc-${id}`);
    setError('');
    try {
      const form = new FormData();
      form.append('document', file);
      const r = await fetch(`/api/insurance-policies/${id}/document`, {method: 'POST', body: form});
      const j = await r.json();
      if (r.ok && j.filePath) setPolicies((v) => v.map((p) => (p.id === id ? {...p, file_path: j.filePath} : p)));
      else setError(j?.error?.message || 'Could not upload document.');
    } finally {
      setBusy(null);
    }
  }

  async function viewDoc(id: string) {
    setBusy(`view-${id}`);
    setError('');
    try {
      const r = await fetch(`/api/insurance-policies/${id}/document`);
      const j = await r.json();
      if (r.ok && j.url) window.open(j.url, '_blank', 'noreferrer');
      else setError('Could not open document.');
    } finally {
      setBusy(null);
    }
  }

  async function removeDoc(id: string) {
    if (!confirm('Remove the attached document?')) return;
    setBusy(`doc-${id}`);
    try {
      const r = await fetch(`/api/insurance-policies/${id}/document`, {method: 'DELETE'});
      if (r.ok) setPolicies((v) => v.map((p) => (p.id === id ? {...p, file_path: null} : p)));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {error && <p role="alert" className="mb-3 text-sm text-[#BE3D2A]">{error}</p>}
      <ul className="space-y-3">
        {policies.map((p) =>
          editId === p.id ? (
            <li key={p.id}>
              <PolicyForm draft={editDraft} setDraft={setEditDraft} onSubmit={() => saveEdit(p.id)} onCancel={() => setEditId(null)} busy={busy === `edit-${p.id}`} submitLabel="Save" />
            </li>
          ) : (
            <li key={p.id} className="rounded-xl border border-black/10 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{p.provider}</p>
                  {p.policy_number && <p className="text-sm text-black/60">Policy {p.policy_number}</p>}
                </div>
                <div className="flex gap-3 text-sm">
                  <button type="button" className="text-clay" onClick={() => {setEditDraft(toDraft(p)); setEditId(p.id);}}>Edit</button>
                  <button type="button" className="text-black/50" disabled={busy === `del-${p.id}`} onClick={() => remove(p.id)}>Delete</button>
                </div>
              </div>
              {p.coverage_summary && <p className="mt-2 text-sm text-black/70">{p.coverage_summary}</p>}
              {p.renewal_date && <p className="mt-1 text-sm text-black/60">Renews {new Date(p.renewal_date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}</p>}
              {p.notes && <p className="mt-1 text-sm text-black/60">{p.notes}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {p.file_path ? (
                  <>
                    <button type="button" className="text-clay" disabled={busy === `view-${p.id}`} onClick={() => viewDoc(p.id)}>{busy === `view-${p.id}` ? 'Opening…' : 'View document'}</button>
                    <button type="button" className="text-black/50" disabled={busy === `doc-${p.id}`} onClick={() => removeDoc(p.id)}>Remove</button>
                  </>
                ) : (
                  <button type="button" className="text-clay" disabled={busy === `doc-${p.id}`} onClick={() => fileRefs.current[p.id]?.click()}>{busy === `doc-${p.id}` ? 'Uploading…' : 'Attach policy document'}</button>
                )}
                <input ref={(el) => {fileRefs.current[p.id] = el;}} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {const f = e.target.files?.[0]; if (f) uploadDoc(p.id, f); e.target.value = '';}} />
              </div>
            </li>
          ),
        )}
      </ul>
      {adding ? (
        <div className="mt-3">
          <PolicyForm draft={addDraft} setDraft={setAddDraft} onSubmit={create} onCancel={() => {setAdding(false); setAddDraft(emptyDraft);}} busy={busy === 'add'} submitLabel="Add policy" />
        </div>
      ) : (
        <button type="button" className="mt-3 text-sm text-clay" onClick={() => setAdding(true)}>+ Add insurance policy</button>
      )}
      <p className="mt-3 text-xs text-black/45">Policy documents are stored privately and never appear on sitter or medical share links.</p>
    </div>
  );
}
