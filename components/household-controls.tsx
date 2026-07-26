'use client';
import {useEffect,useState} from 'react';import {PaywallSheet} from './paywall-sheet';

type Member={id:string;invite_token:string;invited_email:string|null;role:'carer'|'view';status:'pending'|'active'|'revoked';created_at:string;redeemed_at:string|null};

export function HouseholdControls({appUrl}:{appUrl:string}){
const [members,setMembers]=useState<Member[]>([]);
const [loaded,setLoaded]=useState(false);
const [busy,setBusy]=useState(false);
const [paywall,setPaywall]=useState(false);

useEffect(()=>{fetch('/api/household').then(r=>r.json()).then(json=>{if(json.members)setMembers(json.members)}).finally(()=>setLoaded(true))},[]);

async function invite(role:'carer'|'view'){setBusy(true);try{const r=await fetch('/api/household/invite',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role})});if(r.status===402){setPaywall(true);return}if(r.ok){const json=await r.json();setMembers(v=>[json.member,...v])}}finally{setBusy(false)}}

async function revoke(id:string){setMembers(v=>v.map(m=>m.id===id?{...m,status:'revoked'}:m));await fetch(`/api/household/${id}`,{method:'DELETE'})}

const active=members.filter(m=>m.status!=='revoked');

return <div className="mt-3">
<p className="text-sm text-black/60">Invite a partner or carer into the record — every log stays attributed to who did it.</p>
<div className="mt-3 flex gap-3"><button type="button" className="btn ghost" disabled={busy} onClick={()=>invite('carer')}>Invite a carer</button><button type="button" className="btn ghost" disabled={busy} onClick={()=>invite('view')}>Invite a viewer</button></div>
{loaded&&active.length===0&&<p className="mt-3 text-sm text-black/60">No one invited yet.</p>}
{active.length>0&&<div className="mt-4 space-y-3">{active.map(m=><div key={m.id} className="border-t border-black/10 pt-3 first:border-t-0 first:pt-0">
<div className="flex items-center justify-between text-sm"><span className="font-medium capitalize">{m.role}{m.status==='active'?' · joined':' · invited'}</span><button type="button" className="text-clay" onClick={()=>revoke(m.id)}>Revoke</button></div>
{m.status==='pending'&&<p className="mt-1 break-all text-sm text-black/60">{appUrl}/app/household/join/{m.invite_token}</p>}
</div>)}</div>}
{paywall&&<PaywallSheet trigger="household" petName="your pet" onClose={()=>setPaywall(false)}/>}
</div>;
}
