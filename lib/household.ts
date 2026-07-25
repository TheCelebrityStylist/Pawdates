import type {supabase} from './supabase';

type Client=Awaited<ReturnType<typeof supabase>>;

// Household writes must land under the pet's actual owner_user_id, not the
// acting carer's own id — otherwise the row becomes invisible to the owner
// and anyone else in the household (every table's RLS scopes by user_id).
export async function ownerOfPet(client:Client,petId:string):Promise<string|null>{
const {data}=await client.from('pets').select('user_id').eq('id',petId).maybeSingle();
return data?.user_id??null;
}
