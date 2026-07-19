import {notFound,redirect} from 'next/navigation';import {sessionProfile} from '@/lib/access';import {CareProfileEditor} from '@/components/care-profile-editor';

export default async function CareProfilePage({params}:{params:Promise<{id:string}>}){
const {id}=await params;
const session=await sessionProfile();if(!session)redirect(`/app/login?next=/app/pets/${id}/care-profile`);
const {data:pet}=await session.client.from('pets').select('id,name,species').eq('id',id).maybeSingle();
if(!pet)notFound();
const [{data:profile},{data:items}]=await Promise.all([
session.client.from('pet_profile').select('*').eq('pet_id',id).maybeSingle(),
session.client.from('routine_items').select('*').eq('pet_id',id).order('sort_order').order('time')
]);
return <main className="min-h-screen bg-paper px-5 py-10 text-[#272621] [color-scheme:light]"><div className="mx-auto max-w-[640px]"><a className="text-clay" href="/app/settings">← Settings</a><h1 className="mt-8 text-3xl">{pet.name}&apos;s care profile</h1><p className="mt-2 text-sm text-black/60">The everyday handover a sitter actually needs. Every field is optional — only what you fill in shows on the shared view.</p><CareProfileEditor petId={pet.id} initialProfile={profile} initialItems={items||[]}/></div></main>}
