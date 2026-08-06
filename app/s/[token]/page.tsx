import Link from 'next/link';
import Image from 'next/image';
import {notFound} from 'next/navigation';
import {headers} from 'next/headers';
import {admin} from '@/lib/supabase';
import {linkStatus, shareScopeReveals, shareScopeLabel, type ShareLink, type ShareScope} from '@/lib/share-links';
import {observationTagLabel, goodWithLabel, type Behaviour, type Feeding, type HouseLogistics, type Medical, type ObservationTag, type PlayEnrichment, type RoutineNotes, type ToiletHygiene} from '@/lib/care-profile';
import {providerTypeLabel, type EmergencyInfo, type InsurancePolicy, type Provider} from '@/lib/life-admin';
import {dueStatus, expenseCategoryLabel, formatMoney, groomingName, nutritionHasContent, summariseExpenses, type Expense, type Grooming, type NutritionPlan} from '@/lib/daily-care';
import {SitterCheckoff} from '@/components/sitter-checkoff';

export const dynamic = 'force-dynamic';

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
}
function dueLabel(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${date}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return {text: `Overdue by ${Math.abs(days)} day${days === -1 ? '' : 's'}`, overdue: true};
  if (days === 0) return {text: 'Due today', overdue: false};
  if (days === 1) return {text: 'Due tomorrow', overdue: false};
  return {text: `Due in ${days} days`, overdue: false};
}
function ageLabel(birth?: string | null) {
  if (!birth) return null;
  const days = Math.floor((Date.now() - new Date(birth).getTime()) / 86400000);
  if (days < 0) return null;
  if (days < 365) return `${Math.max(1, Math.floor(days / 30))} month${Math.floor(days / 30) === 1 ? '' : 's'} old`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? '' : 's'} old`;
}
function hasAny(obj: Record<string, unknown> | undefined | null) {
  return !!obj && Object.values(obj).some((v) => v !== undefined && v !== null && v !== '');
}

export async function generateMetadata() {
  return {title: 'Shared pet record', robots: {index: false, follow: false}};
}

function Shell({children}: {children: React.ReactNode}) {
  return (
    <main className="min-h-screen bg-[var(--paper)] px-5 py-10">
      <div className="mx-auto max-w-2xl">{children}</div>
    </main>
  );
}

function PoweredBy() {
  return (
    <footer className="card mt-6 p-6 text-center">
      <p className="muted">Powered by Tailtend — create your own pet’s record, free.</p>
      <Link className="btn mt-4" href="/app/signup">Start free on the web</Link>
    </footer>
  );
}

function ExpiredOrRevoked({kind}: {kind: 'expired' | 'revoked'}) {
  const copy =
    kind === 'expired'
      ? {head: 'This link has expired', body: 'The owner set this record to stop sharing after a while, and that time has passed. Ask them for a fresh link if you still need it.'}
      : {head: 'This link was turned off', body: 'The owner has revoked this share link. Ask them for a new one if you still need access.'};
  return (
    <Shell>
      <p className="mono text-[var(--ink-60)]">Shared pet record</p>
      <div className="card mt-6 p-8 text-center">
        <h1 className="text-3xl">{copy.head}</h1>
        <p className="muted mt-4">{copy.body}</p>
      </div>
      <PoweredBy />
    </Shell>
  );
}

export default async function ScopedSharePage({params}: {params: Promise<{token: string}>}) {
  const {token} = await params;
  const db = admin();

  const {data: link} = await db.from('share_links').select('*').eq('token', token).maybeSingle();
  if (!link) notFound();
  const shareLink = link as ShareLink;

  const status = linkStatus(shareLink);
  if (status === 'revoked') return <ExpiredOrRevoked kind="revoked" />;
  if (status === 'expired') return <ExpiredOrRevoked kind="expired" />;

  const scope: ShareScope = shareLink.scope;
  const reveals = shareScopeReveals[scope];

  // Log the access (view count + access log). Best-effort — never let a logging
  // failure block someone from seeing the record they were sent.
  try {
    const h = await headers();
    const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const ua = h.get('user-agent') || 'unknown';
    await db.rpc('record_share_access', {p_token: token, p_ip: ip, p_ua: ua});
  } catch {
    /* logging is non-critical */
  }

  const {data: pet} = await db
    .from('pets')
    .select('id,name,species,birth_date,weight_kg,sex,neutered,microchip_number,colour_markings,photo_path,user_id')
    .eq('id', shareLink.pet_id)
    .single();
  if (!pet) notFound();

  const needsProfile = reveals.essentials || reveals.feeding || reveals.behaviour || reveals.medicalHistory || reveals.contact;
  const today = new Date().toISOString().slice(0, 10);
  const [{data: profileRow}, {data: treatments}, {data: items}, {data: checksToday}, {data: weights}, {data: observations}, {data: owner}] = await Promise.all([
    needsProfile ? db.from('pet_profile').select('*').eq('pet_id', pet.id).maybeSingle() : Promise.resolve({data: null}),
    reveals.treatments || reveals.contact ? db.from('treatments').select('id,name,type,last_given,next_due').eq('pet_id', pet.id).order('next_due') : Promise.resolve({data: null}),
    reveals.routine ? db.from('routine_items').select('*').eq('pet_id', pet.id).order('sort_order').order('time') : Promise.resolve({data: null}),
    reveals.routine ? db.from('routine_checks').select('routine_item_id,checked_by,checked_at').eq('pet_id', pet.id).eq('checked_for_date', today) : Promise.resolve({data: null}),
    reveals.weight ? db.from('weight_log').select('recorded_at,weight_kg').eq('pet_id', pet.id).order('recorded_at') : Promise.resolve({data: null}),
    reveals.observations ? db.from('observation_log').select('tag,note,created_at').eq('pet_id', pet.id).order('created_at', {ascending: false}).limit(15) : Promise.resolve({data: null}),
    reveals.contact ? db.from('profiles').select('email').eq('user_id', pet.user_id).maybeSingle() : Promise.resolve({data: null}),
  ]);

  const profile = profileRow;
  const feeding = (profile?.feeding || {}) as Feeding;
  const routineNotes = (profile?.routine_notes || {}) as RoutineNotes;
  const toiletHygiene = (profile?.toilet_hygiene || {}) as ToiletHygiene;
  const behaviour = (profile?.behaviour || {}) as Behaviour;
  const houseLogistics = (profile?.house_logistics || {}) as HouseLogistics;
  const playEnrichment = (profile?.play_enrichment || {}) as PlayEnrichment;
  const medical = (profile?.medical || {}) as Medical;
  const forbiddenFoods: string[] = profile?.forbidden_foods || [];
  const nextMed = (treatments || []).find((t) => t.type === 'medication');
  const checksMap = new Map((checksToday || []).map((c) => [c.routine_item_id, c]));
  const timelineItems = (items || []).map((i) => {
    const check = checksMap.get(i.id);
    return {...i, checked: !!check, checkedBy: check?.checked_by, checkedAt: check?.checked_at};
  });

  // Life-admin: emergency shows on every scope; insurance + providers are FULL only
  // (enforced by the reveal matrix — a medical or sitter link never fetches them).
  const [{data: emergencyRow}, {data: policies}, {data: providers}, {data: nutritionRow}, {data: grooming}, {data: expenses}] = await Promise.all([
    reveals.emergency ? db.from('emergency_info').select('*').eq('pet_id', pet.id).maybeSingle() : Promise.resolve({data: null}),
    reveals.insurance ? db.from('insurance_policies').select('id,provider,policy_number,coverage_summary,renewal_date').eq('pet_id', pet.id).order('created_at', {ascending: false}) : Promise.resolve({data: null}),
    reveals.providers ? db.from('providers').select('id,type,name,phone,email,notes').eq('pet_id', pet.id).order('type').order('name') : Promise.resolve({data: null}),
    // Nutrition + grooming are on sitter AND full; expenses on full only (owner-only financials).
    reveals.nutrition ? db.from('nutrition_plans').select('*').eq('pet_id', pet.id).maybeSingle() : Promise.resolve({data: null}),
    reveals.grooming ? db.from('grooming_schedule').select('id,task,label,frequency_days,next_due').eq('pet_id', pet.id).order('next_due', {nullsFirst: false}) : Promise.resolve({data: null}),
    reveals.expenses ? db.from('expenses').select('*').eq('pet_id', pet.id).order('spent_on', {ascending: false}) : Promise.resolve({data: null}),
  ]);
  const emergency = (emergencyRow || null) as EmergencyInfo | null;
  const nutrition = (nutritionRow || null) as NutritionPlan | null;
  // Prefer the dedicated emergency_info record; fall back to the older JSONB fields.
  const vetName = emergency?.vet_name || medical.emergencyVetName || houseLogistics.vetName || '';
  const vetPhone = emergency?.vet_phone || medical.emergencyVetPhone || houseLogistics.vetPhone || '';
  const emergencyContactName = emergency?.emergency_contact_name || '';
  const emergencyContactPhone = emergency?.emergency_contact_phone || '';
  const careInstructions = emergency?.care_instructions || '';

  const modeLabel = scope === 'sitter' ? 'Sitter mode' : scope === 'medical' ? 'Medical record' : 'Full record';

  const photoUrl = pet.photo_path ? db.storage.from('pet-photos').getPublicUrl(pet.photo_path).data.publicUrl : null;

  return (
    <Shell>
      {/* Passport masthead band — instantly says what this is to a first-time viewer. */}
      <div className="rounded-t-xl px-5 py-3" style={{background: 'var(--ink)', color: '#EBE3D2'}}>
        <p className="mono text-xs" style={{letterSpacing: '.2em'}}>Tailtend · Pet record</p>
        <p className="mt-1 mono text-sm" style={{color: '#DDB870'}}>{modeLabel} · {shareScopeLabel[scope]}</p>
      </div>

      <div className="card rounded-t-none p-6 md:p-8">
        <header className="flex flex-wrap items-center gap-5 border-b border-[var(--rule)] pb-6">
          <div className="passport-photo relative h-24 w-20 shrink-0">
            {photoUrl ? <Image src={photoUrl} alt={pet.name} fill sizes="80px" className="object-cover" /> : <span className="initial text-3xl">{pet.name[0]}</span>}
            <span className="mrz">Tailtend</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl">{pet.name}</h1>
            <p className="mono mt-2 text-[var(--ink-60)] capitalize">
              {pet.species}
              {ageLabel(pet.birth_date) ? ` · ${ageLabel(pet.birth_date)}` : ''}
              {pet.sex && pet.sex !== 'unknown' ? ` · ${pet.sex}` : ''}
              {pet.neutered !== null ? (pet.neutered ? ' · neutered' : ' · not neutered') : ''}
              {reveals.medicalHistory && pet.weight_kg ? ` · ${pet.weight_kg} kg` : ''}
            </p>
            {reveals.identity && pet.colour_markings ? <p className="mono mt-1 text-xs text-[var(--ink-60)]">{pet.colour_markings}</p> : null}
            {reveals.medicalHistory && pet.microchip_number ? <p className="mono mt-1 text-xs text-[var(--ink-60)]">Chip {pet.microchip_number}</p> : null}
          </div>
          <span className="stamp shrink-0">Read-only</span>
        </header>

        {reveals.essentials && profile?.essentials_flag && (
          <div className="mt-5 rounded-lg p-4" style={{background: 'rgba(190,61,42,.08)', border: '1px solid var(--stamp)'}}>
            <p className="mono text-sm" style={{color: 'var(--stamp)'}}>Read this first</p>
            <p className="mt-1 font-medium">{profile.essentials_flag}</p>
          </div>
        )}

        {reveals.contact && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {vetName && (
              <div className="ledger-row">
                <div><b>Vet</b><p className="mono mt-1 text-[var(--ink-60)]">{vetName}</p></div>
                {vetPhone && <a className="btn ghost" href={`tel:${vetPhone}`}>Call</a>}
              </div>
            )}
            {(emergencyContactName || emergencyContactPhone) && (
              <div className="ledger-row">
                <div><b>Emergency contact</b><p className="mono mt-1 text-[var(--ink-60)]">{emergencyContactName || emergencyContactPhone}</p></div>
                {emergencyContactPhone && <a className="btn ghost" href={`tel:${emergencyContactPhone}`}>Call</a>}
              </div>
            )}
            {reveals.essentials && nextMed && (
              <div className="ledger-row">
                <div><b>Next medication</b><p className="mono mt-1 text-[var(--ink-60)]">{nextMed.name}</p></div>
                <span className={`chip ${dueLabel(nextMed.next_due).overdue ? 'overdue' : 'health'}`}>{dueLabel(nextMed.next_due).text}</span>
              </div>
            )}
            {reveals.feeding && (feeding.feedingTimes || []).length > 0 && (
              <div className="ledger-row">
                <div><b>Feeding times</b></div>
                <span className="mono">{(feeding.feedingTimes || []).join(' · ')}</span>
              </div>
            )}
          </div>
        )}

        {reveals.emergency && careInstructions && (
          <div className="mt-5 rounded-lg border border-[var(--rule)] p-4">
            <p className="mono text-sm text-[var(--ink-60)]">In an emergency</p>
            <p className="mt-1 whitespace-pre-wrap">{careInstructions}</p>
          </div>
        )}

        {reveals.contact && owner?.email && (
          <a className="mt-5 inline-block text-sm underline" href={`mailto:${owner.email}?subject=${encodeURIComponent(`About ${pet.name}`)}`}>Message the owner</a>
        )}
      </div>

      {reveals.routine && timelineItems.length > 0 && (
        <section className="card mt-6 p-6 md:p-8">
          <h2 className="text-2xl">Today’s timeline</h2>
          <div className="mt-4 space-y-2">
            {timelineItems.filter((i) => !i.sitter_can_check).map((i) => (
              <div className="ledger-row" key={i.id}>
                <b>{i.time} · {i.label}</b>
                <span className="mono text-[var(--ink-60)]">{i.category}</span>
              </div>
            ))}
          </div>
          <SitterCheckoff token={shareLink.token} items={timelineItems} petSlug={pet.id} />
        </section>
      )}

      {reveals.essentials && forbiddenFoods.length > 0 && (
        <section className="mt-6 rounded-lg p-5" style={{background: 'rgba(190,61,42,.08)', border: '1px solid var(--stamp)'}}>
          <p className="mono text-sm" style={{color: 'var(--stamp)'}}>Strictly no</p>
          <p className="mt-2 font-medium">{forbiddenFoods.join(', ')}</p>
        </section>
      )}

      {reveals.feeding && hasAny(feeding) && (
        <section className="card mt-6 p-6 md:p-8">
          <h2 className="text-2xl">Food &amp; feeding</h2>
          {feeding.brand && <p className="muted mt-3">{feeding.product ? `${feeding.brand} — ${feeding.product}` : feeding.brand}</p>}
          {feeding.amountPerMeal && <p className="muted mt-2">{feeding.amountPerMeal}{feeding.mealsPerDay ? ` · ${feeding.mealsPerDay}x per day` : ''}</p>}
          {feeding.serveNotes && <p className="muted mt-2">{feeding.serveNotes}</p>}
          {feeding.treatsAllowed && <p className="muted mt-2"><b>Treats:</b> {feeding.treatsAllowed}</p>}
          {feeding.waterNotes && <p className="muted mt-2"><b>Water:</b> {feeding.waterNotes}</p>}
          {feeding.supplements && <p className="muted mt-2"><b>Supplements:</b> {feeding.supplements}</p>}
          {feeding.whereKept && <p className="muted mt-2"><b>Kept:</b> {feeding.whereKept}</p>}
          {feeding.restockBrand && <p className="muted mt-2"><b>Running low?</b> {feeding.restockBrand}</p>}
        </section>
      )}

      {reveals.behaviour && hasAny(routineNotes) && (
        <section className="card mt-6 p-6 md:p-8">
          <h2 className="text-2xl">Exercise &amp; alone time</h2>
          {routineNotes.favouriteRoute && <p className="muted mt-3">{routineNotes.favouriteRoute}</p>}
          {routineNotes.aloneTimeTolerance && <p className="muted mt-2"><b>Alone time:</b> {routineNotes.aloneTimeTolerance}</p>}
          {routineNotes.aloneTimeBehaviour && <p className="muted mt-2">{routineNotes.aloneTimeBehaviour}</p>}
        </section>
      )}

      {reveals.behaviour && hasAny(toiletHygiene) && (
        <section className="card mt-6 p-6 md:p-8">
          <h2 className="text-2xl">Toilet &amp; hygiene</h2>
          {toiletHygiene.dogWalkSchedule && <p className="muted mt-3">{toiletHygiene.dogWalkSchedule}</p>}
          {toiletHygiene.dogSignals && <p className="muted mt-2"><b>Signals:</b> {toiletHygiene.dogSignals}</p>}
          {toiletHygiene.dogAccidentsProtocol && <p className="muted mt-2">{toiletHygiene.dogAccidentsProtocol}</p>}
          {toiletHygiene.catLitterType && <p className="muted mt-2">{toiletHygiene.catLitterType}</p>}
          {toiletHygiene.catBoxLocations && <p className="muted mt-2"><b>Box locations:</b> {toiletHygiene.catBoxLocations}</p>}
          {toiletHygiene.catCleaningRoutine && <p className="muted mt-2">{toiletHygiene.catCleaningRoutine}</p>}
          {toiletHygiene.grooming && <p className="muted mt-2"><b>Grooming:</b> {toiletHygiene.grooming}</p>}
        </section>
      )}

      {reveals.behaviour && hasAny(behaviour) && (
        <section className="card mt-6 p-6 md:p-8">
          <h2 className="text-2xl">Behaviour &amp; temperament</h2>
          {behaviour.personality && <p className="muted mt-3">{behaviour.personality}</p>}
          {behaviour.fearsTriggers && <p className="muted mt-2"><b>Fears &amp; triggers:</b> {behaviour.fearsTriggers}</p>}
          {behaviour.commandsKnown && <p className="muted mt-2"><b>Commands:</b> {behaviour.commandsKnown}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {behaviour.goodWithKids && <span className="chip">Kids: {goodWithLabel[behaviour.goodWithKids]}</span>}
            {behaviour.goodWithDogs && <span className="chip">Dogs: {goodWithLabel[behaviour.goodWithDogs]}</span>}
            {behaviour.goodWithCats && <span className="chip">Cats: {goodWithLabel[behaviour.goodWithCats]}</span>}
            {behaviour.goodWithStrangers && <span className="chip">Strangers: {goodWithLabel[behaviour.goodWithStrangers]}</span>}
          </div>
          {behaviour.handling && <p className="muted mt-3"><b>Handling:</b> {behaviour.handling}</p>}
          {behaviour.comfort && <p className="muted mt-2"><b>What calms them:</b> {behaviour.comfort}</p>}
        </section>
      )}

      {reveals.behaviour && hasAny(playEnrichment) && (
        <section className="card mt-6 p-6 md:p-8">
          <h2 className="text-2xl">Play &amp; enrichment</h2>
          {playEnrichment.favouriteGames && <p className="muted mt-3">{playEnrichment.favouriteGames}</p>}
          {playEnrichment.goodDayLooksLike && <p className="muted mt-2"><b>A good day:</b> {playEnrichment.goodDayLooksLike}</p>}
        </section>
      )}

      {reveals.medicalHistory && (medical.conditions || medical.allergies || medical.medications || medical.vaccinationHistory || medical.pastProcedures) && (
        <section className="card mt-6 p-6 md:p-8">
          <h2 className="text-2xl">Owner-recorded medical history</h2>
          <p className="muted mt-1 text-xs">Recorded by the owner, not a clinical diagnosis.</p>
          {medical.conditions && <p className="muted mt-3"><b>Conditions:</b> {medical.conditions}</p>}
          {medical.allergies && <p className="muted mt-2"><b>Allergies:</b> {medical.allergies}</p>}
          {medical.medications && <p className="muted mt-2"><b>Current medications:</b> {medical.medications}</p>}
          {medical.vaccinationHistory && <p className="muted mt-2"><b>Vaccination history:</b> {medical.vaccinationHistory}</p>}
          {medical.pastProcedures && <p className="muted mt-2"><b>Past procedures:</b> {medical.pastProcedures}</p>}
        </section>
      )}

      {reveals.treatments && (treatments || []).length > 0 && (
        <section className="card mt-6 p-6 md:p-8">
          <h2 className="text-2xl">Treatment record</h2>
          {(treatments || []).map((t) => {
            const due = dueLabel(t.next_due);
            return (
              <div className="ledger-row" key={t.id}>
                <div>
                  <b>{t.name}</b>
                  <p className="mono mt-1 text-[var(--ink-60)]">Last given {fmt(t.last_given)} · Next due {fmt(t.next_due)}</p>
                </div>
                <span className={`chip ${due.overdue ? 'overdue' : 'health'}`}>{due.text}</span>
              </div>
            );
          })}
        </section>
      )}

      {reveals.weight && (weights || []).length > 0 && (
        <section className="card mt-6 p-6 md:p-8">
          <h2 className="text-2xl">Weight history</h2>
          <div className="mt-3 space-y-1">
            {(weights || []).map((w, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="mono text-[var(--ink-60)]">{fmt(w.recorded_at)}</span>
                <span>{w.weight_kg} kg</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {reveals.observations && (observations || []).length > 0 && (
        <section className="card mt-6 p-6 md:p-8">
          <h2 className="text-2xl">Observation log</h2>
          <p className="muted mt-1 text-xs">Owner-logged, zero interpretation.</p>
          <div className="mt-3 space-y-1">
            {(observations || []).map((o, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{observationTagLabel[o.tag as ObservationTag]}{o.note ? ` — ${o.note}` : ''}</span>
                <span className="mono text-[var(--ink-60)]">{fmt(o.created_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {reveals.nutrition && nutritionHasContent(nutrition) && (
        <section className="card mt-6 p-6 md:p-8">
          <h2 className="text-2xl">Nutrition plan</h2>
          {nutrition!.food_brand && <p className="muted mt-3">{nutrition!.food_type ? `${nutrition!.food_brand} — ${nutrition!.food_type}` : nutrition!.food_brand}</p>}
          {nutrition!.portion && <p className="muted mt-2">{nutrition!.portion}{nutrition!.meals_per_day ? ` · ${nutrition!.meals_per_day}x per day` : ''}</p>}
          {(nutrition!.feeding_times || []).length > 0 && <p className="muted mt-2"><b>Feeding times:</b> {(nutrition!.feeding_times || []).join(' · ')}</p>}
          {nutrition!.dietary_restrictions && <p className="muted mt-2"><b>Dietary restrictions:</b> {nutrition!.dietary_restrictions}</p>}
          {nutrition!.notes && <p className="muted mt-2">{nutrition!.notes}</p>}
        </section>
      )}

      {reveals.grooming && (grooming || []).length > 0 && (
        <section className="card mt-6 p-6 md:p-8">
          <h2 className="text-2xl">Grooming</h2>
          {((grooming || []) as Pick<Grooming, 'id' | 'task' | 'label' | 'frequency_days' | 'next_due'>[]).map((g) => {
            const status = dueStatus(g.next_due);
            return (
              <div className="ledger-row" key={g.id}>
                <div><b>{groomingName(g)}</b><p className="mono mt-1 text-[var(--ink-60)]">Every {g.frequency_days} days</p></div>
                {status && <span className={`chip ${status.overdue ? 'overdue' : 'health'}`}>{status.text}</span>}
              </div>
            );
          })}
        </section>
      )}

      {reveals.insurance && (policies || []).length > 0 && (
        <section className="card mt-6 p-6 md:p-8">
          <h2 className="text-2xl">Insurance</h2>
          {((policies || []) as Pick<InsurancePolicy, 'id' | 'provider' | 'policy_number' | 'coverage_summary' | 'renewal_date'>[]).map((p) => (
            <div className="ledger-row" key={p.id}>
              <div>
                <b>{p.provider}</b>
                {p.policy_number && <p className="mono mt-1 text-[var(--ink-60)]">Policy {p.policy_number}</p>}
                {p.coverage_summary && <p className="muted mt-1 text-sm">{p.coverage_summary}</p>}
              </div>
              {p.renewal_date && <span className="mono text-[var(--ink-60)]">Renews {fmt(p.renewal_date)}</span>}
            </div>
          ))}
        </section>
      )}

      {reveals.providers && (providers || []).length > 0 && (
        <section className="card mt-6 p-6 md:p-8">
          <h2 className="text-2xl">Providers</h2>
          {((providers || []) as Pick<Provider, 'id' | 'type' | 'name' | 'phone' | 'email' | 'notes'>[]).map((p) => (
            <div className="ledger-row" key={p.id}>
              <div>
                <b>{p.name}</b>
                <p className="mono mt-1 text-[var(--ink-60)]">{providerTypeLabel[p.type]}</p>
                {p.notes && <p className="muted mt-1 text-sm">{p.notes}</p>}
              </div>
              <div className="text-right text-sm">
                {p.phone && <a className="block underline" href={`tel:${p.phone}`}>{p.phone}</a>}
                {p.email && <a className="block underline" href={`mailto:${p.email}`}>{p.email}</a>}
              </div>
            </div>
          ))}
        </section>
      )}

      {reveals.expenses && (expenses || []).length > 0 && (() => {
        const summary = summariseExpenses((expenses || []) as Expense[]);
        return (
          <section className="card mt-6 p-6 md:p-8">
            <h2 className="text-2xl">Expenses</h2>
            {summary.categories.map((c) => (
              <div className="ledger-row" key={`${c.category}-${c.currency}`}>
                <b>{expenseCategoryLabel[c.category]}</b>
                <span className="mono text-[var(--ink-60)]">{formatMoney(c.cents, c.currency)}</span>
              </div>
            ))}
          </section>
        );
      })()}

      <PoweredBy />
    </Shell>
  );
}
