'use client';
import {useState} from 'react';import {useRouter} from 'next/navigation';

export function HouseholdJoin({token}:{token:string}){
const router=useRouter();
const [busy,setBusy]=useState(false);
const [error,setError]=useState('');

async function join(){setBusy(true);setError('');try{const r=await fetch('/api/household/redeem',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});if(!r.ok){const json=await r.json().catch(()=>null);throw new Error(json?.error?.message||'Could not join')}router.push('/app')}catch(e){setError(e instanceof Error?e.message:'Could not join');setBusy(false)}}

return <div className="mt-6">
<button type="button" className="btn w-full" disabled={busy} onClick={join}>{busy?'Joining…':'Join household'}</button>
{error&&<p role="alert" className="mt-3 text-sm text-[#BE3D2A]">{error}</p>}
</div>;
}
