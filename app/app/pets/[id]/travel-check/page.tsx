import {notFound,redirect} from 'next/navigation';import {sessionProfile} from '@/lib/access';import {TravelCheck} from '@/components/travel-check';

export default async function TravelCheckPage({params}:{params:Promise<{id:string}>}){
const {id}=await params;
const session=await sessionProfile();if(!session)redirect(`/app/login?next=/app/pets/${id}/travel-check`);
const {data:pet}=await session.client.from('pets').select('id,name,rabies_vaccinated_at,microchip_number').eq('id',id).maybeSingle();
if(!pet)notFound();
return <main className="min-h-screen bg-paper px-5 py-10 text-[#272621] [color-scheme:light]"><div className="mx-auto max-w-[480px]"><a className="text-clay" href="/app">← Dashboard</a><h1 className="mt-8 text-3xl">EU travel check</h1><p className="mt-2 text-sm text-black/60">Check {pet.name}&apos;s record against the EU Pet Travel Scheme basics before you book.</p><TravelCheck petName={pet.name} rabiesVaccinatedAt={pet.rabies_vaccinated_at} microchipNumber={pet.microchip_number}/></div></main>}
