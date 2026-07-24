export type TreatmentLite={id:string;name:string;type:string;next_due:string};
export type Status='ok'|'soon'|'overdue'|'none';

export function daysUntil(date:string):number{const today=new Date();today.setHours(0,0,0,0);const due=new Date(`${date}T00:00:00`);return Math.round((due.getTime()-today.getTime())/86400000)}

export function dayLabel(date:string):string{const days=daysUntil(date);if(days===0)return 'today';if(days===1)return 'tomorrow';if(days>1&&days<7)return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB',{weekday:'long'});return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'long'})}

export type ProtectionStatus={status:Status;treatmentName?:string;days:number;dateLabel?:string};

// Structured, not a pre-built sentence, so the UI can animate just the
// number. Overdue beats due-soon beats fully-covered; "protected until X"
// always names the single nearest upcoming date.
export function protectionStatus(treatments:TreatmentLite[]):ProtectionStatus{
if(!treatments.length)return {status:'none',days:0};
const sorted=[...treatments].sort((a,b)=>daysUntil(a.next_due)-daysUntil(b.next_due));
const nearest=sorted[0];
const days=daysUntil(nearest.next_due);
if(days<0)return {status:'overdue',treatmentName:nearest.name,days:Math.abs(days)};
if(days<=3)return {status:'soon',treatmentName:nearest.name,days,dateLabel:dayLabel(nearest.next_due)};
return {status:'ok',treatmentName:nearest.name,days,dateLabel:dayLabel(nearest.next_due)};
}

export type Segment={type:string;label:string;nextDue:string;status:Status};

// One segment per treatment type present on the record, for the horizontal
// protection bar. Status thresholds match protectionStatus so the bar and
// the headline never disagree.
export function protectionSegments(treatments:TreatmentLite[]):Segment[]{
const byType=new Map<string,TreatmentLite>();
for(const t of treatments){const existing=byType.get(t.type);if(!existing||daysUntil(t.next_due)<daysUntil(existing.next_due))byType.set(t.type,t)}
return [...byType.values()].sort((a,b)=>daysUntil(a.next_due)-daysUntil(b.next_due)).map(t=>{const days=daysUntil(t.next_due);const status:Status=days<0?'overdue':days<=3?'soon':'ok';return {type:t.type,label:t.name,nextDue:t.next_due,status}});
}
