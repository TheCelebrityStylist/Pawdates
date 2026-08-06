'use client';
import {useState} from 'react';
import {dueStatus, groomingName, groomingTaskLabel, groomingTasks, type Grooming, type GroomingTask} from '@/lib/daily-care';

type Draft = {task: GroomingTask; label: string; frequencyDays: string; lastDone: string; notes: string};
const emptyDraft: Draft = {task: 'bath', label: '', frequencyDays: '30', lastDone: '', notes: ''};
const toDraft = (g: Grooming): Draft => ({task: g.task, label: g.label || '', frequencyDays: String(g.frequency_days), lastDone: g.last_done || '', notes: g.notes || ''});

function GroomingForm({draft, setDraft, onSubmit, onCancel, busy, submitLabel}: {draft: Draft; setDraft: (d: Draft) => void; onSubmit: () => void; onCancel?: () => void; busy: boolean; submitLabel: string}) {
  return (
    <div className="rounded-xl border border-black/10 bg-black/[.02] p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm"><span className="text-black/60">Task</span>
          <select className="mt-1 min-h-11 w-full rounded-lg border border-black/20 bg-white px-2" value={draft.task} onChange={(e) => setDraft({...draft, task: e.target.value as GroomingTask})}>
            {groomingTasks.map((t) => <option key={t} value={t}>{groomingTaskLabel[t]}</option>)}
          </select>
        </label>
        <label className="block text-sm"><span className="text-black/60">Every N days</span>
          <input type="number" min="1" max="1095" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={draft.frequencyDays} onChange={(e) => setDraft({...draft, frequencyDays: e.target.value})} />
        </label>
      </div>
      <label className="mt-2 block text-sm"><span className="text-black/60">Custom label (optional)</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={draft.label} onChange={(e) => setDraft({...draft, label: e.target.value})} placeholder="Overrides the task name" /></label>
      <label className="mt-2 block text-sm"><span className="text-black/60">Last done (optional)</span><input type="date" max={new Date().toISOString().slice(0, 10)} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={draft.lastDone} onChange={(e) => setDraft({...draft, lastDone: e.target.value})} /></label>
      <label className="mt-2 block text-sm"><span className="text-black/60">Notes</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={draft.notes} onChange={(e) => setDraft({...draft, notes: e.target.value})} /></label>
      <div className="mt-3 flex gap-3">
        <button type="button" className="btn" disabled={busy || !draft.frequencyDays} onClick={onSubmit}>{busy ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className="text-sm text-black/60" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}

export function GroomingSection({petId, initial}: {petId: string; initial: Grooming[]}) {
  const [tasks, setTasks] = useState<Grooming[]>(initial);
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<Draft>(emptyDraft);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  function payload(d: Draft) {
    return {task: d.task, label: d.label || undefined, frequencyDays: Number(d.frequencyDays), lastDone: d.lastDone || null, notes: d.notes || undefined};
  }
  async function create() {
    setBusy('add'); setError('');
    try {
      const r = await fetch(`/api/pets/${petId}/grooming`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(payload(addDraft))});
      const j = await r.json();
      if (r.ok && j.grooming) { setTasks((v) => [...v, j.grooming]); setAddDraft(emptyDraft); setAdding(false); }
      else setError(j?.error?.message || 'Could not save.');
    } finally { setBusy(null); }
  }
  async function saveEdit(id: string) {
    setBusy(`edit-${id}`); setError('');
    try {
      const r = await fetch(`/api/grooming/${id}`, {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify(payload(editDraft))});
      const j = await r.json();
      if (r.ok && j.grooming) { setTasks((v) => v.map((t) => (t.id === id ? j.grooming : t))); setEditId(null); }
      else setError(j?.error?.message || 'Could not save.');
    } finally { setBusy(null); }
  }
  async function markDone(id: string) {
    setBusy(`done-${id}`); setError('');
    try {
      const r = await fetch(`/api/grooming/${id}`, {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({markDone: true})});
      const j = await r.json();
      if (r.ok && j.grooming) setTasks((v) => v.map((t) => (t.id === id ? j.grooming : t)));
      else setError('Could not update.');
    } finally { setBusy(null); }
  }
  async function remove(id: string) {
    if (!confirm('Delete this grooming task? This cannot be undone.')) return;
    setBusy(`del-${id}`); setError('');
    try { const r = await fetch(`/api/grooming/${id}`, {method: 'DELETE'}); if (r.ok) setTasks((v) => v.filter((t) => t.id !== id)); else setError('Could not delete.'); }
    finally { setBusy(null); }
  }

  return (
    <div>
      {error && <p role="alert" className="mb-3 text-sm text-[#BE3D2A]">{error}</p>}
      <ul className="space-y-3">
        {tasks.map((g) =>
          editId === g.id ? (
            <li key={g.id}><GroomingForm draft={editDraft} setDraft={setEditDraft} onSubmit={() => saveEdit(g.id)} onCancel={() => setEditId(null)} busy={busy === `edit-${g.id}`} submitLabel="Save" /></li>
          ) : (
            (() => {
              const status = dueStatus(g.next_due);
              return (
                <li key={g.id} className="rounded-xl border border-black/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{groomingName(g)}</p>
                      <p className="text-sm text-black/60">Every {g.frequency_days} days{g.last_done ? ` · last done ${new Date(g.last_done).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}` : ' · not done yet'}</p>
                      {g.notes && <p className="text-sm text-black/60">{g.notes}</p>}
                      {status && <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${status.overdue ? 'bg-[#BE3D2A]/10 text-[#BE3D2A]' : 'bg-[#2C7455]/10 text-[#2C7455]'}`}>{status.text}</span>}
                    </div>
                    <div className="flex flex-col items-end gap-2 text-sm">
                      <button type="button" className="btn ghost" disabled={busy === `done-${g.id}`} onClick={() => markDone(g.id)}>{busy === `done-${g.id}` ? '…' : 'Mark done'}</button>
                      <div className="flex gap-3">
                        <button type="button" className="text-clay" onClick={() => {setEditDraft(toDraft(g)); setEditId(g.id);}}>Edit</button>
                        <button type="button" className="text-black/50" disabled={busy === `del-${g.id}`} onClick={() => remove(g.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })()
          ),
        )}
      </ul>
      {adding ? (
        <div className="mt-3"><GroomingForm draft={addDraft} setDraft={setAddDraft} onSubmit={create} onCancel={() => {setAdding(false); setAddDraft(emptyDraft);}} busy={busy === 'add'} submitLabel="Add task" /></div>
      ) : (
        <button type="button" className="mt-3 text-sm text-clay" onClick={() => setAdding(true)}>+ Add a grooming task</button>
      )}
      <p className="mt-3 text-xs text-black/45">Grooming reminders use the same due-date engine as treatments, so they appear in your reminder emails too.</p>
    </div>
  );
}
