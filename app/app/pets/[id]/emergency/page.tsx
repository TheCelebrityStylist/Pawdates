import {notFound, redirect} from 'next/navigation';
import {sessionProfile} from '@/lib/access';
import {emergencyHasContent, type EmergencyInfo} from '@/lib/life-admin';
import type {HouseAccess, HouseLogistics, Medical} from '@/lib/care-profile';
import {PrintButton} from '@/components/print-button';

export async function generateMetadata({params}: {params: Promise<{id: string}>}) {
  await params;
  return {title: 'Emergency sheet', robots: {index: false, follow: false}};
}

function ageLabel(birth?: string | null) {
  if (!birth) return null;
  const days = Math.floor((Date.now() - new Date(birth).getTime()) / 86400000);
  if (days < 0) return null;
  if (days < 365) return `${Math.max(1, Math.floor(days / 30))} month${Math.floor(days / 30) === 1 ? '' : 's'} old`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? '' : 's'} old`;
}

export default async function EmergencySheet({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const session = await sessionProfile();
  if (!session) redirect(`/app/login?next=/app/pets/${id}/emergency`);

  const {data: pet} = await session.client.from('pets').select('id,name,species,birth_date,sex,neutered,microchip_number,weight_kg').eq('id', id).maybeSingle();
  if (!pet) notFound();

  const {data: emgRow} = await session.client.from('emergency_info').select('*').eq('pet_id', id).maybeSingle();
  const emergency = (emgRow || null) as EmergencyInfo | null;

  // Transition fallback: if no emergency_info row exists yet, read the same
  // fields from pet_profile JSONB so an old record still prints something useful.
  let contactName = emergency?.emergency_contact_name || '';
  let contactPhone = emergency?.emergency_contact_phone || '';
  let vetName = emergency?.vet_name || '';
  let vetPhone = emergency?.vet_phone || '';
  const careInstructions = emergency?.care_instructions || '';
  if (!emergencyHasContent(emergency)) {
    const {data: profile} = await session.client.from('pet_profile').select('medical,house_logistics,house_access').eq('pet_id', id).maybeSingle();
    const medical = (profile?.medical || {}) as Medical;
    const houseLogistics = (profile?.house_logistics || {}) as HouseLogistics;
    const houseAccess = (profile?.house_access || {}) as HouseAccess;
    contactName = houseAccess.backupContactName || '';
    contactPhone = houseAccess.backupContactPhone || '';
    vetName = medical.emergencyVetName || houseLogistics.vetName || '';
    vetPhone = medical.emergencyVetPhone || houseLogistics.vetPhone || '';
  }

  const age = ageLabel(pet.birth_date);
  const identity = [pet.species, age, pet.sex && pet.sex !== 'unknown' ? pet.sex : null, pet.neutered ? 'neutered' : null, pet.weight_kg ? `${pet.weight_kg} kg` : null].filter(Boolean).join(' · ');

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-[#22303C] [color-scheme:light]">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <a className="text-clay" href={`/app/pets/${id}/edit`}>← Back to {pet.name}</a>
          <PrintButton />
        </div>

        <div className="rounded-2xl border-2 border-[#BE3D2A] p-6">
          <p className="font-mono text-sm uppercase tracking-widest text-[#BE3D2A]">Emergency sheet</p>
          <h1 className="mt-2 text-4xl font-bold">{pet.name}</h1>
          {identity && <p className="mt-1 capitalize text-black/60">{identity}</p>}
          {pet.microchip_number && <p className="mt-1 text-sm text-black/60">Microchip {pet.microchip_number}</p>}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-black/10 p-4">
              <p className="text-xs uppercase tracking-wide text-black/50">Emergency contact</p>
              <p className="mt-1 text-lg font-medium">{contactName || '—'}</p>
              {contactPhone && <a className="text-clay" href={`tel:${contactPhone}`}>{contactPhone}</a>}
            </div>
            <div className="rounded-xl border border-black/10 p-4">
              <p className="text-xs uppercase tracking-wide text-black/50">Vet</p>
              <p className="mt-1 text-lg font-medium">{vetName || '—'}</p>
              {vetPhone && <a className="text-clay" href={`tel:${vetPhone}`}>{vetPhone}</a>}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-black/10 p-4">
            <p className="text-xs uppercase tracking-wide text-black/50">Care instructions</p>
            <p className="mt-2 whitespace-pre-wrap text-black/80">{careInstructions || 'No emergency instructions recorded yet.'}</p>
          </div>

          <p className="mt-6 text-center text-xs text-black/40">Tailtend · keep this where a carer can find it</p>
        </div>
      </div>
    </main>
  );
}
