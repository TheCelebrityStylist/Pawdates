// Static, date-driven seasonal/regional notices. No AI, no medical claims,
// no live data sources — every rule is a fixed calendar window plus,
// where relevant, a readback of the owner's own stored care-profile text.
export type AlertContext={petName:string;species:string;fearsTriggers?:string;comfort?:string};
export type Alert={id:string;text:string};

function inWindow(date:Date,startMonth:number,startDay:number,endMonth:number,endDay:number):boolean{
const m=date.getMonth()+1,d=date.getDate();
const afterStart=m>startMonth||(m===startMonth&&d>=startDay);
const beforeEnd=m<endMonth||(m===endMonth&&d<=endDay);
if(startMonth<=endMonth)return afterStart&&beforeEnd;
return afterStart||beforeEnd;
}

export function activeAlerts(date:Date,ctx:AlertContext):Alert[]{
const out:Alert[]=[];

if(inWindow(date,3,1,10,31)&&(ctx.species==='dog'||ctx.species==='cat')){
out.push({id:'tick-season',text:`Tick season is active in the Netherlands — check ${ctx.petName}'s protection is current.`});
}

if(inWindow(date,12,27,1,2)){
const fireworksNote=ctx.fearsTriggers?.toLowerCase().includes('firework')?ctx.comfort||ctx.fearsTriggers:null;
out.push({id:'fireworks',text:fireworksNote?`Fireworks around New Year. Your saved plan for ${ctx.petName}: ${fireworksNote}`:`Fireworks around New Year can be stressful for pets — worth a plan for ${ctx.petName} now.`});
}

if(inWindow(date,12,10,12,31)){
out.push({id:'christmas-hazards',text:`Christmas hazards to keep clear of ${ctx.petName}: chocolate, tinsel, lilies, and loose wrapping ribbon.`});
}

if(inWindow(date,3,15,5,31)&&ctx.species==='dog'){
out.push({id:'grass-seed',text:`Grass-seed season — check ${ctx.petName}'s paws and ears after walks through long grass.`});
}

if(inWindow(date,9,15,11,30)){
out.push({id:'antifreeze',text:`Antifreeze season — it's toxic and pets are drawn to the smell. Keep ${ctx.petName} away from driveways and garages where it's used.`});
}

return out;
}
