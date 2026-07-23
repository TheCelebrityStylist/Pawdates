import {activeAlerts} from '@/content/alerts';
import type {Behaviour} from '@/lib/care-profile';

type ProfileLite={behaviour?:Behaviour}|null;

export function SeasonalAlert({petName,species,careProfile}:{petName:string;species:string;careProfile:ProfileLite}){
const alerts=activeAlerts(new Date(),{petName,species,fearsTriggers:careProfile?.behaviour?.fearsTriggers,comfort:careProfile?.behaviour?.comfort});
if(!alerts.length)return null;
const alert=alerts[0];
return <p className="mt-4 border-l-2 border-[var(--brass)] bg-[var(--card)] p-3 text-sm">{alert.text}</p>;
}
