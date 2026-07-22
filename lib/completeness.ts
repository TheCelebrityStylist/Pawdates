// Record completeness formula — documented so the gate can check it directly.
// Ten equally-weighted checks (10 points each, 100 total):
//  1. Pet photo
//  2. Birth date
//  3. Current weight (pet.weight_kg or a weight_log entry)
//  4. At least one treatment tracked
//  5. Care-profile essentials flag
//  6. Care-profile feeding info (brand or amount per meal)
//  7. Care-profile vet contact (house_logistics.vetName)
//  8. Vet visit logged within the last 12 months
//  9. Care-profile behaviour info (personality or fears/triggers)
// 10. Care-profile forbidden-foods list (even an empty confirmed list of
//     "none" is not detectable, so this checks for at least one entry)

import type {Behaviour,Feeding,HouseLogistics} from './care-profile';

export type CompletenessInput={
pet:{photo_path:string|null;birth_date:string|null;weight_kg:number|null};
hasWeightLog:boolean;
hasTreatment:boolean;
profile:{essentials_flag:string|null;forbidden_foods:string[];feeding:Feeding;behaviour:Behaviour;house_logistics:HouseLogistics}|null;
lastVetVisit:string|null;
};

export type CompletenessItem={key:string;label:string;met:boolean;points:number};

export function completeness(input:CompletenessInput):{percent:number;items:CompletenessItem[]}{
const p=input.profile;
const withinYear=input.lastVetVisit?(Date.now()-new Date(input.lastVetVisit).getTime())<365*86400000:false;
const items:CompletenessItem[]=[
{key:'photo',label:'Add a photo',met:!!input.pet.photo_path,points:10},
{key:'birth_date',label:'Add a birth date',met:!!input.pet.birth_date,points:10},
{key:'weight',label:'Log a weight',met:!!input.pet.weight_kg||input.hasWeightLog,points:10},
{key:'treatment',label:'Track a treatment',met:input.hasTreatment,points:10},
{key:'essentials',label:'Add the one-line essentials flag',met:!!p?.essentials_flag,points:10},
{key:'feeding',label:'Add feeding details',met:!!(p?.feeding.brand||p?.feeding.amountPerMeal),points:10},
{key:'vet_contact',label:'Save the vet’s contact',met:!!p?.house_logistics.vetName,points:10},
{key:'vet_visit',label:'Log a recent vet visit',met:withinYear,points:10},
{key:'behaviour',label:'Add behaviour notes',met:!!(p?.behaviour.personality||p?.behaviour.fearsTriggers),points:10},
{key:'forbidden_foods',label:'Add forbidden foods',met:!!(p?.forbidden_foods.length),points:10}
];
const percent=items.reduce((sum,item)=>sum+(item.met?item.points:0),0);
return {percent,items};
}
