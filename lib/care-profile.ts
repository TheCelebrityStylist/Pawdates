import {z} from 'zod';

export const feedingSchema=z.object({
brand:z.string().max(120).optional(),
product:z.string().max(120).optional(),
amountPerMeal:z.string().max(60).optional(),
mealsPerDay:z.number().int().min(0).max(12).optional(),
feedingTimes:z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).max(12).optional(),
serveStyle:z.enum(['dry','wet','mixed']).optional(),
serveNotes:z.string().max(300).optional(),
treatsAllowed:z.string().max(300).optional(),
waterNotes:z.string().max(300).optional(),
supplements:z.string().max(300).optional(),
whereKept:z.string().max(200).optional(),
restockBrand:z.string().max(200).optional()
}).partial();

export const routineNotesSchema=z.object({
walksPerDay:z.number().int().min(0).max(12).optional(),
walkLengthMinutes:z.number().int().min(0).max(240).optional(),
leadStyle:z.enum(['on-lead','off-lead','mixed']).optional(),
favouriteRoute:z.string().max(300).optional(),
pace:z.string().max(200).optional(),
aloneTimeTolerance:z.string().max(300).optional(),
aloneTimeBehaviour:z.string().max(300).optional(),
crate:z.enum(['crate','no-crate']).optional()
}).partial();

export const toiletHygieneSchema=z.object({
dogWalkSchedule:z.string().max(300).optional(),
dogSignals:z.string().max(300).optional(),
dogAccidentsProtocol:z.string().max(300).optional(),
catLitterType:z.string().max(200).optional(),
catBoxLocations:z.string().max(300).optional(),
catCleaningRoutine:z.string().max(300).optional(),
grooming:z.string().max(300).optional()
}).partial();

export const behaviourSchema=z.object({
personality:z.string().max(500).optional(),
fearsTriggers:z.string().max(500).optional(),
commandsKnown:z.string().max(300).optional(),
goodWithKids:z.enum(['yes','some','no']).optional(),
goodWithDogs:z.enum(['yes','some','no']).optional(),
goodWithCats:z.enum(['yes','some','no']).optional(),
goodWithStrangers:z.enum(['yes','some','no']).optional(),
handling:z.string().max(500).optional(),
comfort:z.string().max(300).optional()
}).partial();

export const houseLogisticsSchema=z.object({
whereThingsLive:z.string().max(500).optional(),
houseRules:z.string().max(500).optional(),
otherPets:z.string().max(300).optional()
}).partial();

// Kept separate from houseLogistics: household-security-sensitive fields
// that require the owner's explicit house_access_shared opt-in before
// they're ever rendered on a public share view.
export const houseAccessSchema=z.object({
entryNotes:z.string().max(300).optional(),
alarmNotes:z.string().max(300).optional(),
whichDoor:z.string().max(200).optional(),
backupContactName:z.string().max(120).optional(),
backupContactPhone:z.string().max(60).optional()
}).partial();

export const playEnrichmentSchema=z.object({
favouriteGames:z.string().max(300).optional(),
favouriteToys:z.string().max(300).optional(),
tricks:z.string().max(300).optional(),
goodDayLooksLike:z.string().max(300).optional()
}).partial();

export type Feeding=z.infer<typeof feedingSchema>;
export type RoutineNotes=z.infer<typeof routineNotesSchema>;
export type ToiletHygiene=z.infer<typeof toiletHygieneSchema>;
export type Behaviour=z.infer<typeof behaviourSchema>;
export type HouseLogistics=z.infer<typeof houseLogisticsSchema>;
export type HouseAccess=z.infer<typeof houseAccessSchema>;
export type PlayEnrichment=z.infer<typeof playEnrichmentSchema>;

export const careProfileSchema=z.object({
essentialsFlag:z.string().max(280).optional(),
forbiddenFoods:z.array(z.string().max(60)).max(30).optional(),
feeding:feedingSchema.optional(),
routineNotes:routineNotesSchema.optional(),
toiletHygiene:toiletHygieneSchema.optional(),
behaviour:behaviourSchema.optional(),
houseLogistics:houseLogisticsSchema.optional(),
houseAccess:houseAccessSchema.optional(),
playEnrichment:playEnrichmentSchema.optional(),
houseAccessShared:z.boolean().optional(),
liveCheckoffEnabled:z.boolean().optional()
});

export const routineCategories=['wake','meal','walk','play','nap','medication','bedtime','other'] as const;
export type RoutineCategory=(typeof routineCategories)[number];
export const routineItemSchema=z.object({time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),label:z.string().min(1).max(120),category:z.enum(routineCategories),sitterCanCheck:z.boolean().optional()});

export const goodWithLabel:Record<'yes'|'some'|'no',string>={yes:'Yes',some:'Some',no:'No'};
