import {notFound,redirect} from 'next/navigation';import {sessionProfile} from '@/lib/access';import {PetEditor} from '@/components/pet-editor';import {InsuranceSection} from '@/components/insurance-section';import {ProvidersSection} from '@/components/providers-section';import {EmergencySection} from '@/components/emergency-section';import {NutritionSection} from '@/components/nutrition-section';import {GroomingSection} from '@/components/grooming-section';import {ExpensesSection} from '@/components/expenses-section';import type {EmergencyInfo,InsurancePolicy,Provider} from '@/lib/life-admin';import type {Expense,Grooming,NutritionPlan} from '@/lib/daily-care';

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
// Daily-care tables (migration 0017) may not be applied yet — fall back to empty.
const [expRes,nutRes,groomRes]=await Promise.all([
session.client.from('expenses').select('*').eq('pet_id',id).order('spent_on',{ascending:false}),
session.client.from('nutrition_plans').select('*').eq('pet_id',id).maybeSingle(),
session.client.from('grooming_schedule').select('*').eq('pet_id',id).order('next_due',{nullsFirst:false})
]);
const expenses=(expRes.error?[]:expRes.data||[]) as Expense[];
const nutrition=(nutRes.error?null:nutRes.data||null) as NutritionPlan|null;
const grooming=(groomRes.error?[]:groomRes.data||[]) as Grooming[];
return <main className="min-h-screen bg-paper px-5 py-10 text-[var(--ink)] [color-scheme:light]"><div className="mx-auto max-w-[520px]"><a className="mono text-[var(--brass-ink)]" href="/app">← Dashboard</a><p className="mono mt-8 text-[var(--ink-40)]">Pet record · No. {id.slice(0,8).toUpperCase()}</p><h1 className="mt-1 text-4xl">Edit {pet.name}</h1>
<PetEditor pet={pet} photoUrl={photoUrl}/>
<section className="mt-8 card p-5"><h2 className="rule-label">Emergency info</h2><p className="mt-1 text-sm text-black/60">The one card a sitter or vet needs if something goes wrong. Included on every share link.</p><div className="mt-4"><EmergencySection petId={id} initial={emergency}/></div></section>
<section className="mt-4 card p-5"><h2 className="rule-label">Insurance</h2><p className="mt-1 text-sm text-black/60">Policies and documents. Only ever shown on a full-record share link.</p><div className="mt-4"><InsuranceSection petId={id} initial={policies}/></div></section>
<section className="mt-4 card p-5"><h2 className="rule-label">Providers</h2><p className="mt-1 text-sm text-black/60">Vet, groomer, sitter, walker, boarding. Only ever shown on a full-record share link.</p><div className="mt-4"><ProvidersSection petId={id} initial={providers}/></div></section>
<section className="mt-4 card p-5"><h2 className="rule-label">Nutrition</h2><p className="mt-1 text-sm text-black/60">Food, portions and feeding times. Shown on sitter and full-record share links.</p><div className="mt-4"><NutritionSection petId={id} initial={nutrition}/></div></section>
<section className="mt-4 card p-5"><h2 className="rule-label">Grooming</h2><p className="mt-1 text-sm text-black/60">Recurring grooming tasks with the same reminder engine as treatments. Shown on sitter and full-record links.</p><div className="mt-4"><GroomingSection petId={id} initial={grooming}/></div></section>
<section className="mt-4 card p-5"><h2 className="rule-label">Expenses</h2><p className="mt-1 text-sm text-black/60">A simple ledger with monthly and per-category totals. Owner-only — full-record links only.</p><div className="mt-4"><ExpensesSection petId={id} initial={expenses}/></div></section>
</div></main>}
