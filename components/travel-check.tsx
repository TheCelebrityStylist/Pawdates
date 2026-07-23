'use client';
import {useState} from 'react';import {checkEuTravel} from '@/lib/eu-travel';

export function TravelCheck({petName,rabiesVaccinatedAt,microchipNumber}:{petName:string;rabiesVaccinatedAt:string|null;microchipNumber:string|null}){
const [travelDate,setTravelDate]=useState('');
const result=travelDate?checkEuTravel(travelDate,rabiesVaccinatedAt,microchipNumber):null;

return <div>
<label className="mt-4 block text-sm"><span className="text-black/60">Travelling on</span><input type="date" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={travelDate} onChange={e=>setTravelDate(e.target.value)}/></label>

{result&&<div className="mt-5 space-y-3">
<div className="flex items-center gap-2 text-sm"><span>{result.microchipOk?'✓':'✗'}</span><span>Microchip on record{result.microchipOk?'':` — add ${petName}'s microchip number in Edit to track this`}</span></div>
{result.rabiesOk===null?<div className="flex items-center gap-2 text-sm"><span>?</span><span>No rabies vaccination date on record — add it in Edit to check timing</span></div>:
<div className="flex items-center gap-2 text-sm"><span>{result.rabiesOk?'✓':'✗'}</span><span>{result.rabiesOk?'Rabies vaccination is more than 21 days before travel.':`Rabies vaccination needs ${result.rabiesDaysShort} more day${result.rabiesDaysShort===1?'':'s'} to clear the 21-day rule — earliest travel date is ${result.minTravelDate}.`}</span></div>}
<p className="mt-4 text-xs text-black/50">General EU Pet Travel Scheme guidance (microchip + rabies vaccination ≥21 days before travel), not legal or veterinary advice. Destination countries can add requirements — confirm with your vet and the destination&apos;s official pet-travel guidance before booking.</p>
</div>}
</div>;
}
