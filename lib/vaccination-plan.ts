export type Milestone={weeks:number;label:string;detail:string};

const dog:Milestone[]=[
{weeks:7,label:'First vaccination + first deworming',detail:'Typically given by the breeder or shelter around 6–8 weeks.'},
{weeks:9,label:'Second deworming',detail:'Worming continues roughly every 2 weeks while very young.'},
{weeks:11,label:'Second vaccination',detail:'Given around 10–12 weeks, roughly 3–4 weeks after the first dose.'},
{weeks:13,label:'Socialisation window closing soon',detail:'12–16 weeks is considered the most sensitive period for positive exposure — ask your vet about safe early socialising.'},
{weeks:15,label:'Third vaccination',detail:'Often includes rabies where required; full outdoor access typically begins here.'},
{weeks:26,label:'Move to monthly worming + neuter conversation',detail:'Worming typically shifts to a monthly interval; ask your vet about spay/neuter timing.'},
{weeks:52,label:'First annual health check',detail:'Move onto an adult booster and prevention schedule.'}];

const cat:Milestone[]=[
{weeks:7,label:'First vaccination + first deworming',detail:'Typically given by the breeder or shelter around 6–9 weeks.'},
{weeks:9,label:'Second deworming',detail:'Worming continues roughly every 2 weeks while very young.'},
{weeks:10,label:'Second vaccination',detail:'Given around 9–12 weeks, roughly 3–4 weeks after the first dose.'},
{weeks:26,label:'Move to monthly worming + neuter conversation',detail:'Worming typically shifts to a monthly interval; ask your vet about spay/neuter timing.'},
{weeks:52,label:'First annual health check',detail:'Move onto an adult booster and prevention schedule.'}];

export function planFor(species:'dog'|'cat',birthISO:string){
const milestones=species==='cat'?cat:dog;const birth=new Date(`${birthISO}T00:00:00Z`);
if(Number.isNaN(birth.getTime()))return [];
return milestones.map(m=>{const date=new Date(birth);date.setUTCDate(date.getUTCDate()+m.weeks*7);return {...m,date:date.toISOString().slice(0,10)}})
}
