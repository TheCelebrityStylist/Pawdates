'use client';
import {useState} from 'react';import {trackHandoverDownloaded} from '@/lib/track';
type Pet={id:string;name:string;share_token:string;share_enabled:boolean;vet_share_token:string;vet_share_enabled:boolean};
export function ShareControls({pets,appUrl}:{pets:Pet[];appUrl:string}){
const [state,setState]=useState(pets);
const [busy,setBusy]=useState<string|null>(null);
async function toggle(id:string,enabled:boolean,regenerate=false){setBusy(id);try{const r=await fetch(`/api/pets/${id}/share`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({enabled,regenerate})});if(r.ok){const json=await r.json();setState(v=>v.map(p=>p.id===id?{...p,share_enabled:json.shareEnabled,share_token:json.shareToken}:p))}}finally{setBusy(null)}}
async function toggleVet(id:string,enabled:boolean,regenerate=false){setBusy(`vet-${id}`);try{const r=await fetch(`/api/pets/${id}/vet-share`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({enabled,regenerate})});if(r.ok){const json=await r.json();setState(v=>v.map(p=>p.id===id?{...p,vet_share_enabled:json.vetShareEnabled,vet_share_token:json.vetShareToken}:p))}}finally{setBusy(null)}}
if(!state.length)return <p className="mt-2 text-sm text-black/60">Add a pet to get a shareable record link.</p>;
return <div className="mt-3 space-y-4">{state.map(pet=><div key={pet.id} className="border-t border-black/10 pt-3 first:border-t-0 first:pt-0">
<div className="flex items-center justify-between"><span className="font-medium">{pet.name}</span><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pet.share_enabled} disabled={busy===pet.id} onChange={e=>toggle(pet.id,e.target.checked)}/>Sitter share link</label></div>
{pet.share_enabled&&<div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-black/60"><span className="break-all">{appUrl}/share/{pet.share_token}</span><button type="button" className="text-clay" disabled={busy===pet.id} onClick={()=>toggle(pet.id,true,true)}>Revoke &amp; get new link</button></div>}
<div className="mt-3 flex items-center justify-between"><span className="text-sm text-black/60">Vet share (clinical view only)</span><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pet.vet_share_enabled} disabled={busy===`vet-${pet.id}`} onChange={e=>toggleVet(pet.id,e.target.checked)}/>Vet link</label></div>
{pet.vet_share_enabled&&<div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-black/60"><span className="break-all">{appUrl}/vet/{pet.vet_share_token}</span><button type="button" className="text-clay" disabled={busy===`vet-${pet.id}`} onClick={()=>toggleVet(pet.id,true,true)}>Revoke &amp; get new link</button></div>}
<div className="mt-2 flex gap-4"><a className="text-sm text-clay" href={`/app/pets/${pet.id}/care-profile`}>Edit care profile</a><a className="text-sm text-clay" href={`/api/pets/${pet.id}/record.pdf`} onClick={()=>trackHandoverDownloaded({pet:pet.id})}>Download PDF record</a></div>
</div>)}</div>}
