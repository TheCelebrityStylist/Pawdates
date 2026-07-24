'use client';
import {useRef,useState} from 'react';import {useRouter} from 'next/navigation';import Image from 'next/image';

type Pet={id:string;name:string;birth_date:string|null;weight_kg:number|null;photo_path:string|null;sex:'male'|'female'|'unknown'|null;neutered:boolean|null;microchip_number:string|null;microchip_registry:string|null;passport_number:string|null;colour_markings:string|null;insurance_provider:string|null;insurance_policy:string|null;origin:string|null;height_cm:number|null;body_condition:string|null;coat_type:string|null;grooming_interval_days:number|null;rabies_vaccinated_at:string|null};

function Field({label,value,onChange,placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string}){return <label className="mt-3 block text-sm"><span className="text-black/60">{label}</span><input className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}

export function PetEditor({pet,photoUrl}:{pet:Pet;photoUrl:string|null}){
const router=useRouter();
const fileRef=useRef<HTMLInputElement>(null);
const [preview,setPreview]=useState(photoUrl);
const [birthDate,setBirthDate]=useState(pet.birth_date||'');
const [weight,setWeight]=useState(pet.weight_kg?String(pet.weight_kg):'');
const [more,setMore]=useState(false);
const [sex,setSex]=useState(pet.sex||'unknown');
const [neutered,setNeutered]=useState(pet.neutered??false);
const [microchipNumber,setMicrochipNumber]=useState(pet.microchip_number||'');
const [microchipRegistry,setMicrochipRegistry]=useState(pet.microchip_registry||'');
const [passportNumber,setPassportNumber]=useState(pet.passport_number||'');
const [colourMarkings,setColourMarkings]=useState(pet.colour_markings||'');
const [insuranceProvider,setInsuranceProvider]=useState(pet.insurance_provider||'');
const [insurancePolicy,setInsurancePolicy]=useState(pet.insurance_policy||'');
const [origin,setOrigin]=useState(pet.origin||'');
const [heightCm,setHeightCm]=useState(pet.height_cm?String(pet.height_cm):'');
const [bodyCondition,setBodyCondition]=useState(pet.body_condition||'');
const [coatType,setCoatType]=useState(pet.coat_type||'');
const [groomingIntervalDays,setGroomingIntervalDays]=useState(pet.grooming_interval_days?String(pet.grooming_interval_days):'');
const [rabiesVaccinatedAt,setRabiesVaccinatedAt]=useState(pet.rabies_vaccinated_at||'');
const [uploading,setUploading]=useState(false);
const [saving,setSaving]=useState(false);
const [error,setError]=useState('');
const [saved,setSaved]=useState(false);

async function uploadPhoto(file:File){setUploading(true);setError('');try{const form=new FormData();form.append('photo',file);const r=await fetch(`/api/pets/${pet.id}/photo`,{method:'POST',body:form});const json=await r.json();if(!r.ok)throw new Error(json.error?.message||'Upload failed');setPreview(json.photoUrl);router.refresh()}catch(e){setError(e instanceof Error?e.message:'Upload failed')}finally{setUploading(false)}}

async function save(){setSaving(true);setError('');setSaved(false);try{const r=await fetch(`/api/pets/${pet.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({birthDate:birthDate||undefined,weightKg:weight?Number(weight):undefined,logWeight:!!weight,sex,neutered,microchipNumber:microchipNumber||undefined,microchipRegistry:microchipRegistry||undefined,passportNumber:passportNumber||undefined,colourMarkings:colourMarkings||undefined,insuranceProvider:insuranceProvider||undefined,insurancePolicy:insurancePolicy||undefined,origin:origin||undefined,heightCm:heightCm?Number(heightCm):undefined,bodyCondition:bodyCondition||undefined,coatType:coatType||undefined,groomingIntervalDays:groomingIntervalDays?Number(groomingIntervalDays):undefined,rabiesVaccinatedAt:rabiesVaccinatedAt||undefined})});if(!r.ok)throw new Error('Could not save');setSaved(true);router.refresh()}catch(e){setError(e instanceof Error?e.message:'Could not save')}finally{setSaving(false)}}

return <div className="mt-8">
<div className="flex items-center gap-5">
<button type="button" onClick={()=>fileRef.current?.click()} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-black/10 bg-white" aria-label="Upload photo">
{preview?<Image src={preview} alt="" fill sizes="96px" className="object-cover"/>:<span className="grid h-full w-full place-items-center text-2xl font-semibold text-black/40">{pet.name[0]}</span>}
</button>
<div>
<button type="button" className="text-sm text-clay" onClick={()=>fileRef.current?.click()} disabled={uploading}>{uploading?'Uploading…':preview?'Change photo':'Add a photo'}</button>
<p className="mt-1 text-xs text-black/50">JPEG, PNG or WebP, up to 5MB.</p>
</div>
<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)uploadPhoto(f)}}/>
</div>

<label className="mt-6 block text-sm"><span className="text-black/60">Birth date</span><input type="date" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={birthDate} max={new Date().toISOString().slice(0,10)} onChange={e=>setBirthDate(e.target.value)}/></label>
<label className="mt-4 block text-sm"><span className="text-black/60">Current weight (kg)</span><input type="number" step="0.1" min="0" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={weight} onChange={e=>setWeight(e.target.value)}/></label>

<button type="button" className="mono mt-6 text-[var(--ink-60)]" onClick={()=>setMore(v=>!v)}>{more?'Hide more details':'More details — identity, insurance, travel'}</button>
{more&&<div className="mt-3">
<div className="flex items-center justify-between text-sm"><span className="text-black/60">Sex</span><div className="flex gap-1">{(['male','female','unknown'] as const).map(v=><button type="button" key={v} onClick={()=>setSex(v)} className={`rounded-full border px-3 py-1 ${sex===v?'border-clay bg-clay/10':'border-black/15'}`}>{v}</button>)}</div></div>
<label className="mt-3 flex items-center justify-between text-sm"><span className="text-black/60">Neutered / spayed</span><input type="checkbox" checked={neutered} onChange={e=>setNeutered(e.target.checked)}/></label>
<Field label="Microchip number" value={microchipNumber} onChange={setMicrochipNumber}/>
<Field label="Microchip registry" value={microchipRegistry} onChange={setMicrochipRegistry}/>
<Field label="Passport number" value={passportNumber} onChange={setPassportNumber}/>
<Field label="Colour / markings" value={colourMarkings} onChange={setColourMarkings}/>
<Field label="Insurance provider" value={insuranceProvider} onChange={setInsuranceProvider}/>
<Field label="Insurance policy number" value={insurancePolicy} onChange={setInsurancePolicy}/>
<Field label="Breeder / shelter of origin" value={origin} onChange={setOrigin}/>
<label className="mt-3 block text-sm"><span className="text-black/60">Height (cm)</span><input type="number" step="0.1" min="0" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={heightCm} onChange={e=>setHeightCm(e.target.value)}/></label>
<Field label="Body-condition note" value={bodyCondition} onChange={setBodyCondition}/>
<Field label="Coat type" value={coatType} onChange={setCoatType}/>
<label className="mt-3 block text-sm"><span className="text-black/60">Grooming interval (days)</span><input type="number" min="1" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={groomingIntervalDays} onChange={e=>setGroomingIntervalDays(e.target.value)}/></label>
<label className="mt-3 block text-sm"><span className="text-black/60">Rabies vaccination date — for EU travel</span><input type="date" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2" value={rabiesVaccinatedAt} max={new Date().toISOString().slice(0,10)} onChange={e=>setRabiesVaccinatedAt(e.target.value)}/></label>
</div>}

{error&&<p role="alert" className="mt-3 text-sm text-[#BE3D2A]">{error}</p>}
<button type="button" className="btn mt-6 w-full" disabled={saving} onClick={save}>{saving?'Saving…':'Save'}</button>
{saved&&<p role="status" className="mt-3 text-center text-sm text-black/60">Saved.</p>}
</div>}
