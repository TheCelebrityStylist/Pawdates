import {activeAlerts} from '@/content/alerts';
import type {Behaviour} from '@/lib/care-profile';

type ProfileLite={behaviour?:Behaviour}|null;

export function SeasonalAlert({petName,species,careProfile}:{petName:string;species:string;careProfile:ProfileLite}){
const alerts=activeAlerts(new Date(),{petName,species,fearsTriggers:careProfile?.behaviour?.fearsTriggers,comfort:careProfile?.behaviour?.comfort});
if(!alerts.length)return null;
const alert=alerts[0];
return <div className="mt-4 flex items-start gap-3 rounded-2xl p-4" style={{background:'rgba(169,124,47,.09)'}}>
<span aria-hidden className="text-lg leading-none">💡</span>
<p className="text-sm leading-[1.6] text-[var(--ink)]">{alert.text}</p>
</div>;
}
