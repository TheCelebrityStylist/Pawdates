'use client';
import {useEffect,useState} from 'react';import {observationTagLabel,observationTags,type ObservationTag} from '@/lib/care-profile';

type Entry={id:string;tag:ObservationTag;note:string|null;created_at:string};

export function ObservationLog({petId}:{petId:string}){
const [entries,setEntries]=useState<Entry[]>([]);
const [open,setOpen]=useState(false);
const [tag,setTag]=useState<ObservationTag>('scratching');
const [note,setNote]=useState('');
const [saving,setSaving]=useState(false);
const [loaded,setLoaded]=useState(false);

useEffect(()=>{fetch(`/api/pets/${petId}/observations`).then(r=>r.json()).then(json=>{if(json.observations)setEntries(json.observations)}).finally(()=>setLoaded(true))},[petId]);

async function log(){setSaving(true);try{const r=await fetch(`/api/pets/${petId}/observations`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tag,note:note||undefined})});const json=await r.json();if(r.ok){setEntries(v=>[json.observation,...v]);setNote('');setOpen(false)}}finally{setSaving(false)}}

return <div className="mt-8 border-t border-[var(--rule)] pt-5">
<div className="flex items-center justify-between"><h2 className="mono text-[var(--ink-60)]">Observation log</h2><button type="button" className="mono text-[var(--health)]" onClick={()=>setOpen(v=>!v)}>{open?'Cancel':'+ Log something'}</button></div>
{open&&<div className="mt-3">
<div className="flex flex-wrap gap-2">{observationTags.map(t=><button type="button" key={t} onClick={()=>setTag(t)} className={`chip ${tag===t?'health':''}`}>{observationTagLabel[t]}</button>)}</div>
<textarea className="mt-3 w-full rounded-lg border border-[var(--rule)] bg-transparent px-3 py-2 text-sm" rows={2} placeholder="Optional note — what you saw, no interpretation needed" value={note} onChange={e=>setNote(e.target.value)}/>
<button type="button" className="btn mt-3" disabled={saving} onClick={log}>{saving?'Saving…':'Log it'}</button>
</div>}
{loaded&&entries.length===0&&!open&&<p className="muted mt-3 text-sm">Nothing logged yet — a quick tap here builds raw material for vet visits later.</p>}
{entries.length>0&&<div className="mt-4 space-y-2">{entries.slice(0,5).map(e=><div key={e.id} className="flex items-center justify-between text-sm"><span>{observationTagLabel[e.tag]}{e.note?` — ${e.note}`:''}</span><span className="mono text-[var(--ink-60)]">{new Date(e.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</span></div>)}</div>}
</div>;
}
