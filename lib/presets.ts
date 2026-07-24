export const presets=[{type:'flea_tick',name:'Flea & tick',days:30},{type:'worming',name:'Worming',days:90},{type:'heartworm',name:'Heartworm',days:30},{type:'vaccination',name:'Vaccination',days:365},{type:'medication',name:'Medication',days:30},{type:'grooming',name:'Grooming',days:42},{type:'vet_checkup',name:'Vet check-up',days:365}] as const;
export type PresetType=(typeof presets)[number]['type'];
export const presetFor=(type:string)=>presets.find(p=>p.type===type);
