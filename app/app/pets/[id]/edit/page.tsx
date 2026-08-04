import {notFound,redirect} from 'next/navigation';import {sessionProfile} from '@/lib/access';import {PetEditor} from '@/components/pet-editor';import {InsuranceSection} from '@/components/insurance-section';import {ProvidersSection} from '@/components/providers-section';import {EmergencySection} from '@/components/emergency-section';import type {EmergencyInfo,InsurancePolicy,Provider} from '@/lib/life-admin';

export default async function EditPetPage({params}:{params:Promise<{id:string}>}){
const {id}=await params;
const session=await sessionProfile();if(!session)redirect(`/app/login?next=/app/pets/${id}/edit`);
const wide=await session.client.from('pets').select('id,name,birth_date,weight_kg,photo_path,sex,neutered,microchip_number,microchip_registry,passport_number,colour_markings,origin,height_cm,body_condition,coat_type,grooming_interval_days,rabies_vaccinated_at').eq('id',id).maybeSingle();
const base=wide.error?await session.client.from('pets').select('id,name,birth_date,weight_kg,photo_path').eq('id',id).maybeSingle():null;
const pet=wide.error?(base?.data?{...base.data,sex:null,neutered:null,microchip_number:null,microchip_registry:null,passport_number:null,colour_markings:null,origin:null,height_cm:null,body_condition:null,coat_type:null,grooming_interval_days:null,rabies_vaccinated_at:null}:null):wide.data;
if(!pet)notFound();
const photoUrl=pet.photo_path?session.client.storage.from('pet-photos').getPublicUrl(pet.photo_path).data.publicUrl:null;
// Life-admin tables (migration 0015) may not be applied yet — fall back to empty so the page still renders.
const [insRes,provRes,emgRes]=await Promise.all([
session.client.from('insurance_policies').select('*').eq('pet_id',id).order('created_at',{ascending:false}),
session.client.from('providers').select('*').eq('pet_id',id).order('type').order('name'),
session.client.from('emergency_info').select('*').eq('pet_id',id).maybeSingle()
]);
const policies=(insRes.error?[]:insRes.data||[]) as InsurancePolicy[];
const providers=(provRes.error?[]:provRes.data||[]) as Provider[];
const emergency=(emgRes.error?null:emgRes.data||null) as EmergencyInfo|null;
return <main className="min-h-screen bg-paper px-5 py-10 text-[#272621] [color-scheme:light]"><div className="mx-auto max-w-[520px]"><a className="text-clay" href="/app">← Dashboard</a><h1 className="mt-8 text-3xl">Edit {pet.name}</h1>
<PetEditor pet={pet} photoUrl={photoUrl}/>
<section className="mt-8 rounded-2xl border border-black/10 bg-white p-5"><h2 className="font-medium">Emergency info</h2><p className="mt-1 text-sm text-black/60">The one card a sitter or vet needs if something goes wrong. Included on every share link.</p><div className="mt-4"><EmergencySection petId={id} initial={emergency}/></div></section>
<section className="mt-4 rounded-2xl border border-black/10 bg-white p-5"><h2 className="font-medium">Insurance</h2><p className="mt-1 text-sm text-black/60">Policies and documents. Only ever shown on a full-record share link.</p><div className="mt-4"><InsuranceSection petId={id} initial={policies}/></div></section>
<section className="mt-4 rounded-2xl border border-black/10 bg-white p-5"><h2 className="font-medium">Providers</h2><p className="mt-1 text-sm text-black/60">Vet, groomer, sitter, walker, boarding. Only ever shown on a full-record share link.</p><div className="mt-4"><ProvidersSection petId={id} initial={providers}/></div></section>
</div></main>}
