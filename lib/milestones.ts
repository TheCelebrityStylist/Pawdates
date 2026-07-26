export type AutoMilestone={date:string;title:string};

// Birthday anniversaries between birth and today, computed on the fly —
// no storage needed, and it naturally back-fills history for pets added
// long after they were born.
export function birthdayMilestones(birthDate:string|null,upTo=new Date()):AutoMilestone[]{
if(!birthDate)return [];
const b=new Date(`${birthDate}T00:00:00`);
if(Number.isNaN(b.getTime())||b>upTo)return [];
const out:AutoMilestone[]=[];
for(let year=b.getFullYear()+1;;year++){
const d=new Date(b);d.setFullYear(year);
if(d>upTo)break;
out.push({date:d.toISOString().slice(0,10),title:`Turned ${year-b.getFullYear()}`});
}
return out;
}
