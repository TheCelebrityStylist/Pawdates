'use client';
import {useState} from 'react';
import type {EmergencyInfo} from '@/lib/life-admin';

export function EmergencySection({petId, initial}: {petId: string; initial: EmergencyInfo | null}) {
  const [contactName, setContactName] = useState(initial?.emergency_contact_name || '');
  const [contactPhone, setContactPhone] = useState(initial?.emergency_contact_phone || '');
  const [vetName, setVetName] = useState(initial?.vet_name || '');
  const [vetPhone, setVetPhone] = useState(initial?.vet_phone || '');
  const [careInstructions, setCareInstructions] = useState(initial?.care_instructions || '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const r = await fetch(`/api/pets/${petId}/emergency`, {
        method: 'PUT',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          emergencyContactName: contactName || undefined,
          emergencyContactPhone: contactPhone || undefined,
          vetName: vetName || undefined,
          vetPhone: vetPhone || undefined,
          careInstructions: careInstructions || undefined,
        }),
      });
      if (!r.ok) throw new Error('Could not save');
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <p role="alert" className="mb-3 text-sm text-[#BE3D2A]">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm"><span className="text-black/60">Emergency contact name</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="A person who can step in" /></label>
        <label className="block text-sm"><span className="text-black/60">Emergency contact phone</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></label>
        <label className="block text-sm"><span className="text-black/60">Vet name</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={vetName} onChange={(e) => setVetName(e.target.value)} /></label>
        <label className="block text-sm"><span className="text-black/60">Vet phone</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={vetPhone} onChange={(e) => setVetPhone(e.target.value)} /></label>
      </div>
      <label className="mt-3 block text-sm"><span className="text-black/60">Care instructions in an emergency</span><textarea className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" rows={4} value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} placeholder="Anything a carer or vet must know if something goes wrong — conditions, medications, allergies, what to do first." /></label>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="button" className="btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save emergency info'}</button>
        <a className="text-sm text-clay" href={`/app/pets/${petId}/emergency`} target="_blank" rel="noreferrer">Open printable sheet →</a>
      </div>
      {saved && <p role="status" className="mt-3 text-sm text-black/60">Saved.</p>}
    </div>
  );
}
