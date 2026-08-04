'use client';
import {useMemo, useRef, useState} from 'react';
import {expenseCategories, expenseCategoryLabel, formatMoney, summariseExpenses, type Expense, type ExpenseCategory} from '@/lib/daily-care';

type Draft = {category: ExpenseCategory; amount: string; currency: string; spentOn: string; notes: string};
const today = () => new Date().toISOString().slice(0, 10);
const emptyDraft = (): Draft => ({category: 'vet', amount: '', currency: 'EUR', spentOn: today(), notes: ''});
const toDraft = (e: Expense): Draft => ({category: e.category, amount: (e.amount_cents / 100).toFixed(2), currency: e.currency, spentOn: e.spent_on, notes: e.notes || ''});

function ExpenseForm({draft, setDraft, onSubmit, onCancel, busy, submitLabel}: {draft: Draft; setDraft: (d: Draft) => void; onSubmit: () => void; onCancel?: () => void; busy: boolean; submitLabel: string}) {
  return (
    <div className="rounded-xl border border-black/10 bg-black/[.02] p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm"><span className="text-black/60">Category</span>
          <select className="mt-1 min-h-11 w-full rounded-lg border border-black/20 bg-white px-2" value={draft.category} onChange={(e) => setDraft({...draft, category: e.target.value as ExpenseCategory})}>
            {expenseCategories.map((c) => <option key={c} value={c}>{expenseCategoryLabel[c]}</option>)}
          </select>
        </label>
        <label className="block text-sm"><span className="text-black/60">Date</span>
          <input type="date" max={today()} className="mt-1 min-h-11 w-full rounded-lg border border-black/20 bg-white px-2" value={draft.spentOn} onChange={(e) => setDraft({...draft, spentOn: e.target.value})} />
        </label>
        <label className="block text-sm"><span className="text-black/60">Amount</span>
          <input type="number" step="0.01" min="0" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={draft.amount} onChange={(e) => setDraft({...draft, amount: e.target.value})} placeholder="0.00" />
        </label>
        <label className="block text-sm"><span className="text-black/60">Currency</span>
          <input maxLength={3} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 uppercase" value={draft.currency} onChange={(e) => setDraft({...draft, currency: e.target.value.toUpperCase()})} />
        </label>
      </div>
      <label className="mt-2 block text-sm"><span className="text-black/60">Notes</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={draft.notes} onChange={(e) => setDraft({...draft, notes: e.target.value})} /></label>
      <div className="mt-3 flex gap-3">
        <button type="button" className="btn" disabled={busy || !draft.amount || !/^[A-Z]{3}$/.test(draft.currency)} onClick={onSubmit}>{busy ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className="text-sm text-black/60" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}

export function ExpensesSection({petId, initial}: {petId: string; initial: Expense[]}) {
  const [expenses, setExpenses] = useState<Expense[]>(initial);
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<Draft>(emptyDraft());
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const summary = useMemo(() => summariseExpenses(expenses), [expenses]);

  async function create() {
    setBusy('add'); setError('');
    try {
      const r = await fetch(`/api/pets/${petId}/expenses`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({category: addDraft.category, amount: Number(addDraft.amount), currency: addDraft.currency, spentOn: addDraft.spentOn, notes: addDraft.notes || undefined})});
      const j = await r.json();
      if (r.ok && j.expense) { setExpenses((v) => [j.expense, ...v]); setAddDraft(emptyDraft()); setAdding(false); }
      else setError(j?.error?.message || 'Could not save expense.');
    } finally { setBusy(null); }
  }
  async function saveEdit(id: string) {
    setBusy(`edit-${id}`); setError('');
    try {
      const r = await fetch(`/api/expenses/${id}`, {method: 'PATCH', headers: {'content-type': 'application/json'}, body: JSON.stringify({category: editDraft.category, amount: Number(editDraft.amount), currency: editDraft.currency, spentOn: editDraft.spentOn, notes: editDraft.notes || undefined})});
      const j = await r.json();
      if (r.ok && j.expense) { setExpenses((v) => v.map((e) => (e.id === id ? j.expense : e))); setEditId(null); }
      else setError(j?.error?.message || 'Could not save.');
    } finally { setBusy(null); }
  }
  async function remove(id: string) {
    if (!confirm('Delete this expense? This cannot be undone.')) return;
    setBusy(`del-${id}`); setError('');
    try { const r = await fetch(`/api/expenses/${id}`, {method: 'DELETE'}); if (r.ok) setExpenses((v) => v.filter((e) => e.id !== id)); else setError('Could not delete.'); }
    finally { setBusy(null); }
  }
  async function uploadReceipt(id: string, file: File) {
    setBusy(`rc-${id}`); setError('');
    try {
      const form = new FormData(); form.append('receipt', file);
      const r = await fetch(`/api/expenses/${id}/receipt`, {method: 'POST', body: form});
      const j = await r.json();
      if (r.ok && j.receiptPath) setExpenses((v) => v.map((e) => (e.id === id ? {...e, receipt_path: j.receiptPath} : e)));
      else setError(j?.error?.message || 'Could not upload receipt.');
    } finally { setBusy(null); }
  }
  async function viewReceipt(id: string) {
    setBusy(`rv-${id}`); setError('');
    try { const r = await fetch(`/api/expenses/${id}/receipt`); const j = await r.json(); if (r.ok && j.url) window.open(j.url, '_blank', 'noreferrer'); else setError('Could not open receipt.'); }
    finally { setBusy(null); }
  }

  return (
    <div>
      {error && <p role="alert" className="mb-3 text-sm text-[#BE3D2A]">{error}</p>}

      {expenses.length > 0 && (
        <div className="mb-4 rounded-xl border border-black/10 bg-black/[.02] p-3">
          <p className="text-sm font-medium">This month{summary.monthly.length === 0 && ' — nothing yet'}</p>
          {summary.monthly.map((m) => <p key={m.currency} className="text-lg font-semibold">{formatMoney(m.cents, m.currency)}</p>)}
          {summary.categories.length > 0 && (
            <div className="mt-2 border-t border-black/10 pt-2">
              <p className="text-xs uppercase tracking-wide text-black/50">All-time by category</p>
              <ul className="mt-1 space-y-1 text-sm">
                {summary.categories.map((c) => (
                  <li key={`${c.category}-${c.currency}`} className="flex justify-between"><span className="text-black/60">{expenseCategoryLabel[c.category]}</span><span>{formatMoney(c.cents, c.currency)}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <ul className="space-y-3">
        {expenses.map((e) =>
          editId === e.id ? (
            <li key={e.id}><ExpenseForm draft={editDraft} setDraft={setEditDraft} onSubmit={() => saveEdit(e.id)} onCancel={() => setEditId(null)} busy={busy === `edit-${e.id}`} submitLabel="Save" /></li>
          ) : (
            <li key={e.id} className="rounded-xl border border-black/10 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{formatMoney(e.amount_cents, e.currency)} <span className="ml-1 rounded-full bg-black/[.06] px-2 py-0.5 text-xs text-black/60">{expenseCategoryLabel[e.category]}</span></p>
                  <p className="text-sm text-black/60">{new Date(e.spent_on).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}{e.notes ? ` · ${e.notes}` : ''}</p>
                </div>
                <div className="flex gap-3 text-sm">
                  <button type="button" className="text-clay" onClick={() => {setEditDraft(toDraft(e)); setEditId(e.id);}}>Edit</button>
                  <button type="button" className="text-black/50" disabled={busy === `del-${e.id}`} onClick={() => remove(e.id)}>Delete</button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                {e.receipt_path ? (
                  <button type="button" className="text-clay" disabled={busy === `rv-${e.id}`} onClick={() => viewReceipt(e.id)}>{busy === `rv-${e.id}` ? 'Opening…' : 'View receipt'}</button>
                ) : (
                  <button type="button" className="text-clay" disabled={busy === `rc-${e.id}`} onClick={() => fileRefs.current[e.id]?.click()}>{busy === `rc-${e.id}` ? 'Uploading…' : 'Attach receipt'}</button>
                )}
                <input ref={(el) => {fileRefs.current[e.id] = el;}} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(ev) => {const f = ev.target.files?.[0]; if (f) uploadReceipt(e.id, f); ev.target.value = '';}} />
              </div>
            </li>
          ),
        )}
      </ul>

      {adding ? (
        <div className="mt-3"><ExpenseForm draft={addDraft} setDraft={setAddDraft} onSubmit={create} onCancel={() => {setAdding(false); setAddDraft(emptyDraft());}} busy={busy === 'add'} submitLabel="Add expense" /></div>
      ) : (
        <button type="button" className="mt-3 text-sm text-clay" onClick={() => setAdding(true)}>+ Add an expense</button>
      )}
      <p className="mt-3 text-xs text-black/45">Expenses and receipts are owner-only — they never appear on any share link except a full-record one.</p>
    </div>
  );
}
