import {notFound,redirect} from 'next/navigation';import {sessionProfile} from '@/lib/access';import {PetEditor} from '@/components/pet-editor';

export default async function EditPetPage({params}:{params:Promise<{id:string}>}){
const {id}=await params;
const session=await sessionProfile();if(!session)redirect(`/app/login?next=/app/pets/${id}/edit`);
const {data:pet}=await session.client.from('pets').select('id,name,birth_date,weight_kg,photo_path,sex,neutered,microchip_number,microchip_registry,passport_number,colour_markings,insurance_provider,insurance_policy,origin,height_cm,body_condition,coat_type,grooming_interval_days,rabies_vaccinated_at').eq('id',id).maybeSingle();
if(!pet)notFound();
const photoUrl=pet.photo_path?session.client.storage.from('pet-photos').getPublicUrl(pet.photo_path).data.publicUrl:null;
return <main className="min-h-screen bg-paper px-5 py-10 text-[#272621] [color-scheme:light]"><div className="mx-auto max-w-[480px]"><a className="text-clay" href="/app">← Dashboard</a><h1 className="mt-8 text-3xl">Edit {pet.name}</h1><PetEditor pet={pet} photoUrl={photoUrl}/></div></main>}
