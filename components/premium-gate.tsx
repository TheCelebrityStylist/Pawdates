'use client';
import {useState} from 'react';import {PaywallSheet,type PaywallTrigger} from './paywall-sheet';

export function PremiumGate({trigger,petName,description}:{trigger:PaywallTrigger;petName:string;description:string}){
const [open,setOpen]=useState(false);
return <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 text-center">
<p className="text-sm font-medium text-clay">Tailtend Premium</p>
<p className="mt-2 text-sm text-black/60">{description}</p>
<button type="button" className="btn mt-4" onClick={()=>setOpen(true)}>Unlock</button>
{open&&<PaywallSheet trigger={trigger} petName={petName} onClose={()=>setOpen(false)}/>}
</div>;
}
