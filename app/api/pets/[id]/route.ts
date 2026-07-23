import {z} from 'zod';import {sessionProfile} from '@/lib/access';import {fail,ok} from '@/lib/http';import {identitySchema} from '@/lib/care-profile';

const schema=z.object({birthDate:z.string().date().optional(),weightKg:z.number().positive().max(500).optional(),logWeight:z.boolean().optional()}).merge(identitySchema);

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
try{
const session=await sessionProfile();if(!session)return fail('unauthorized','Sign in required',401);
const {id}=await params;if(!z.string().uuid().safeParse(id).success)return fail('invalid_id','Invalid pet');
const body=schema.parse(await req.json());
const patch:Record<string,unknown>={};
if(body.birthDate!==undefined)patch.birth_date=body.birthDate;
if(body.weightKg!==undefined)patch.weight_kg=body.weightKg;
if(body.sex!==undefined)patch.sex=body.sex;
if(body.neutered!==undefined)patch.neutered=body.neutered;
if(body.microchipNumber!==undefined)patch.microchip_number=body.microchipNumber;
if(body.microchipRegistry!==undefined)patch.microchip_registry=body.microchipRegistry;
if(body.passportNumber!==undefined)patch.passport_number=body.passportNumber;
if(body.colourMarkings!==undefined)patch.colour_markings=body.colourMarkings;
if(body.insuranceProvider!==undefined)patch.insurance_provider=body.insuranceProvider;
if(body.insurancePolicy!==undefined)patch.insurance_policy=body.insurancePolicy;
if(body.origin!==undefined)patch.origin=body.origin;
if(body.heightCm!==undefined)patch.height_cm=body.heightCm;
if(body.bodyCondition!==undefined)patch.body_condition=body.bodyCondition;
if(body.coatType!==undefined)patch.coat_type=body.coatType;
if(body.groomingIntervalDays!==undefined)patch.grooming_interval_days=body.groomingIntervalDays;
if(body.rabiesVaccinatedAt!==undefined)patch.rabies_vaccinated_at=body.rabiesVaccinatedAt;
if(Object.keys(patch).length){const {error}=await session.client.from('pets').update(patch).eq('id',id);if(error)return fail('save_failed',error.message,400)}
if(body.logWeight&&body.weightKg!==undefined){const {error}=await session.client.from('weight_log').upsert({pet_id:id,user_id:session.user.id,recorded_at:new Date().toISOString().slice(0,10),weight_kg:body.weightKg},{onConflict:'pet_id,recorded_at'});if(error)return fail('save_failed',error.message,400)}
return ok({updated:true})
}catch(e){return fail('invalid_request',e instanceof Error?e.message:'Invalid request',400)}
}
