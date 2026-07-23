import {presetFor} from './presets';

export type Verdict={status:'overdue'|'due-today'|'upcoming';days:number;nextDue:string};

export function checkOverdue(type:string,lastGivenISO:string):Verdict|null{
const preset=presetFor(type);if(!preset||!lastGivenISO)return null;
const last=new Date(`${lastGivenISO}T00:00:00Z`);if(Number.isNaN(last.getTime()))return null;
const next=new Date(last);next.setUTCDate(next.getUTCDate()+preset.days);
const today=new Date();today.setUTCHours(0,0,0,0);
const diffDays=Math.round((next.getTime()-today.getTime())/86400000);
return {status:diffDays<0?'overdue':diffDays===0?'due-today':'upcoming',days:Math.abs(diffDays),nextDue:next.toISOString().slice(0,10)};
}
