'use client';
import {useRef,useState} from 'react';import {useRouter} from 'next/navigation';import Image from 'next/image';

type Pet={id:string;name:string;birth_date:string|null;weight_kg:number|null;photo_path:string|null};

export function PetEditor({pet,photoUrl}:{pet:Pet;photoUrl:string|null}){
const router=useRouter();
const fileRef=useRef<HTMLInputElement>(null);
const [preview,setPreview]=useState(photoUrl);
const [birthDate,setBirthDate]=useState(pet.birth_date||'');
const [weight,setWeight]=useState(pet.weight_kg?String(pet.weight_kg):'');
const [uploading,setUploading]=useState(false);
const [saving,setSaving]=useState(false);
const [error,setError]=useState('');
const [saved,setSaved]=useState(false);

async function uploadPhoto(file:File){setUploading(true);setError('');try{const form=new FormData();form.append('photo',file);const r=await fetch(`/api/pets/${pet.id}/photo`,{method:'POST',body:form});const json=await r.json();if(!r.ok)throw new Error(json.error?.message||'Upload failed');setPreview(json.photoUrl);router.refresh()}catch(e){setError(e instanceof Error?e.message:'Upload failed')}finally{setUploading(false)}}

async function save(){setSaving(true);setError('');setSaved(false);try{const r=await fetch(`/api/pets/${pet.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({birthDate:birthDate||undefined,weightKg:weight?Number(weight):undefined,logWeight:!!weight})});if(!r.ok)throw new Error('Could not save');setSaved(true);router.refresh()}catch(e){setError(e instanceof Error?e.message:'Could not save')}finally{setSaving(false)}}

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

{error&&<p role="alert" className="mt-3 text-sm text-[#BE3D2A]">{error}</p>}
<button type="button" className="btn mt-6 w-full" disabled={saving} onClick={save}>{saving?'Saving…':'Save'}</button>
{saved&&<p role="status" className="mt-3 text-center text-sm text-black/60">Saved.</p>}
</div>}
