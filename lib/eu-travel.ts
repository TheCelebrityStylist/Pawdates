// Factual EU Pet Travel Scheme (Regulation 576/2013) checklist — not legal
// or veterinary advice. Rules can vary by destination country; this checks
// only the two universal baseline requirements: a microchip on record, and
// rabies vaccination at least 21 days before travel.
export type TravelCheck={
microchipOk:boolean;
rabiesOk:boolean|null;
rabiesDaysShort:number|null;
minTravelDate:string|null;
};

export function checkEuTravel(travelDate:string,rabiesVaccinatedAt:string|null,microchipNumber:string|null):TravelCheck{
const microchipOk=!!microchipNumber;
if(!rabiesVaccinatedAt)return {microchipOk,rabiesOk:null,rabiesDaysShort:null,minTravelDate:null};
const vacc=new Date(`${rabiesVaccinatedAt}T00:00:00`);
const travel=new Date(`${travelDate}T00:00:00`);
const minTravel=new Date(vacc);minTravel.setDate(minTravel.getDate()+21);
const daysUntilTravel=Math.round((travel.getTime()-vacc.getTime())/86400000);
const rabiesOk=daysUntilTravel>=21;
return {microchipOk,rabiesOk,rabiesDaysShort:rabiesOk?null:21-daysUntilTravel,minTravelDate:minTravel.toISOString().slice(0,10)};
}
