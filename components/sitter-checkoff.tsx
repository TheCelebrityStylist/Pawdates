'use client';
import {useEffect,useState} from 'react';import {trackSitterCheckedItem,trackSitterViewOpened} from '@/lib/track';

type Item={id:string;time:string;label:string;category:string;sitter_can_check:boolean;checked:boolean;checkedBy?:string;checkedAt?:string};

export function SitterCheckoff({token,items,petSlug}:{token:string;items:Item[];petSlug:string}){
const [state,setState]=useState(items);
const [name,setName]=useState('');
const [busy,setBusy]=useState<string|null>(null);
const [error,setError]=useState('');

useEffect(()=>{trackSitterViewOpened({pet:petSlug})},[petSlug]);

async function check(id:string){
if(!name.trim()){setError('Enter your name first so the owner knows who checked in.');return}
setError('');setBusy(id);
try{
const r=await fetch(`/api/share/${token}/checkoff`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({routineItemId:id,checkedBy:name.trim()})});
if(r.ok){setState(v=>v.map(i=>i.id===id?{...i,checked:true,checkedBy:name.trim(),checkedAt:new Date().toISOString()}:i));trackSitterCheckedItem({pet:petSlug})}
else setError('Could not save — check your connection and try again.');
}finally{setBusy(null)}
}

const checkable=state.filter(i=>i.sitter_can_check);
if(!checkable.length)return null;

return <div className="mt-4"><label className="mono block text-sm">Your name<input className="rule-input mt-1" value={name} onChange={e=>setName(e.target.value)} placeholder="Sitter's name"/></label>
{error&&<p role="alert" className="mt-3 text-sm" style={{color:'var(--stamp)'}}>{error}</p>}
<div className="mt-4 space-y-2">{checkable.map(i=><div key={i.id} className="ledger-row"><div><b>{i.time} · {i.label}</b>{i.checked&&<p className="mono mt-1 text-[var(--health)]">Done by {i.checkedBy} · {i.checkedAt?new Date(i.checkedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):''}</p>}</div>{i.checked?<span className="chip health">Checked</span>:<button type="button" className="btn ghost" disabled={busy===i.id} onClick={()=>check(i.id)}>{busy===i.id?'Saving…':'Mark done'}</button>}</div>)}</div>
</div>}
