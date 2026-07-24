import type {CompletenessInput} from './completeness';

export type Suggestion={key:string;text:string;href:string};

function monthsAgo(iso:string):number{return Math.max(1,Math.round((Date.now()-new Date(iso).getTime())/(30*86400000)))}

// Picks one candidate suggestion from what's missing on the record. Ties are
// broken by a rotation seed (pass day-of-year, or a visit counter) so the
// same gap isn't shown every single time — day-to-day the record nudges
// toward a different piece of itself.
export function pickSuggestion(petId:string,petName:string,input:CompletenessInput,lastWeightLog:string|null,seed:number):Suggestion|null{
const candidates:Suggestion[]=[];
if(!input.pet.photo_path)candidates.push({key:'photo',text:`Add a photo of ${petName}`,href:`/app/pets/${petId}/edit`});
if(lastWeightLog)candidates.push({key:'weight',text:`Log ${petName}’s weight — last recorded ${monthsAgo(lastWeightLog)} month${monthsAgo(lastWeightLog)===1?'':'s'} ago`,href:`/app/pets/${petId}/edit`});
else if(!input.pet.weight_kg)candidates.push({key:'weight',text:`Log ${petName}’s weight`,href:`/app/pets/${petId}/edit`});
const completenessPercent=(()=>{const p=input.profile;let pts=0;if(input.pet.photo_path)pts+=10;if(input.pet.birth_date)pts+=10;if(input.pet.weight_kg||input.hasWeightLog)pts+=10;if(input.hasTreatment)pts+=10;if(p?.essentials_flag)pts+=10;if(p?.feeding.brand||p?.feeding.amountPerMeal)pts+=10;if(p?.house_logistics.vetName)pts+=10;if(input.lastVetVisit&&(Date.now()-new Date(input.lastVetVisit).getTime())<365*86400000)pts+=10;if(p?.behaviour.personality||p?.behaviour.fearsTriggers)pts+=10;if(p?.forbidden_foods.length)pts+=10;return pts})();
if(completenessPercent<100&&!(input.profile?.feeding.brand||input.profile?.feeding.amountPerMeal))candidates.push({key:'care_profile',text:`${petName}’s care profile is ${completenessPercent}% complete — add feeding times so a sitter could take over tomorrow`,href:`/app/pets/${petId}/care-profile`});
if(!input.profile?.house_logistics.vetName)candidates.push({key:'vet_contact',text:`${petName}’s vet number isn’t saved yet`,href:`/app/pets/${petId}/care-profile`});
if(input.lastVetVisit){const months=monthsAgo(input.lastVetVisit);if(months>=6)candidates.push({key:'vet_visit',text:`It’s been ${months} months since ${petName}’s last vet visit note`,href:`/app/pets/${petId}/edit`})}
else candidates.push({key:'vet_visit',text:`Log ${petName}’s first vet visit`,href:`/app/pets/${petId}/edit`});
if(!candidates.length)return null;
return candidates[((seed%candidates.length)+candidates.length)%candidates.length];
}
