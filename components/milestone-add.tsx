'use client';
import {useState} from 'react';

export function MilestoneAdd({petId,onAdded}:{petId:string;onAdded:()=>void}){
const [open,setOpen]=useState(false);
const [title,setTitle]=useState('');
const [note,setNote]=useState('');
const [occurredOn,setOccurredOn]=useState(new Date().toISOString().slice(0,10));
const [photo,setPhoto]=useState<File|null>(null);
const [saving,setSaving]=useState(false);
const [error,setError]=useState('');

async function save(){if(!title.trim())return;setSaving(true);setError('');try{const form=new FormData();form.append('title',title);form.append('occurredOn',occurredOn);if(note)form.append('note',note);if(photo)form.append('photo',photo);const r=await fetch(`/api/pets/${petId}/milestones`,{method:'POST',body:form});if(!r.ok)throw new Error('Could not save');setTitle('');setNote('');setPhoto(null);setOpen(false);onAdded()}catch(e){setError(e instanceof Error?e.message:'Could not save')}finally{setSaving(false)}}

return <div className="mt-4">
<button type="button" className="mono text-[var(--health)]" onClick={()=>setOpen(v=>!v)}>{open?'Cancel':'+ Add a milestone'}</button>
{open&&<div className="mt-3">
<input className="w-full rounded-lg border border-[var(--rule)] bg-transparent px-3 py-2 text-sm" placeholder="First swim, gotcha day, new trick…" value={title} onChange={e=>setTitle(e.target.value)}/>
<div className="mt-2 flex flex-wrap gap-2">
<input type="date" className="rounded-lg border border-[var(--rule)] bg-transparent px-3 py-2 text-sm" value={occurredOn} max={new Date().toISOString().slice(0,10)} onChange={e=>setOccurredOn(e.target.value)}/>
<input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={e=>setPhoto(e.target.files?.[0]||null)}/>
</div>
<textarea className="mt-2 w-full rounded-lg border border-[var(--rule)] bg-transparent px-3 py-2 text-sm" rows={2} placeholder="Optional note" value={note} onChange={e=>setNote(e.target.value)}/>
{error&&<p role="alert" className="mt-2 text-sm" style={{color:'var(--stamp)'}}>{error}</p>}
<button type="button" className="btn mt-3" disabled={saving} onClick={save}>{saving?'Saving…':'Add milestone'}</button>
</div>}
</div>;
}
