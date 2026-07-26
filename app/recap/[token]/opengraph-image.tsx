import {ImageResponse} from 'next/og';import {admin} from '@/lib/supabase';import {birthdayMilestones} from '@/lib/milestones';

export const size={width:1200,height:630};
export const contentType='image/png';

export default async function Image({params}:{params:Promise<{token:string}>}){
const {token}=await params;
const db=admin();
const {data:pet}=await db.from('pets').select('id,name,species,birth_date,photo_path,created_at,share_enabled').eq('share_token',token).maybeSingle();

if(!pet||!pet.share_enabled)return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#F7F2E9',color:'#22303C',fontFamily:'sans-serif',fontSize:40}}>Tailtend</div>,size);

const {data:treatmentIds}=await db.from('treatments').select('id').eq('pet_id',pet.id);
const ids=(treatmentIds||[]).map(t=>t.id);
const [{count:milestoneCount},{count:doneCount},{count:onTimeCount}]=await Promise.all([
db.from('milestones').select('id',{count:'exact',head:true}).eq('pet_id',pet.id),
ids.length?db.from('treatment_log').select('id',{count:'exact',head:true}).in('treatment_id',ids):Promise.resolve({count:0}),
ids.length?db.from('treatment_log').select('id',{count:'exact',head:true}).in('treatment_id',ids).eq('was_overdue',false):Promise.resolve({count:0})
]);

const daysTracked=Math.max(1,Math.round((Date.now()-new Date(pet.created_at).getTime())/86400000));
const years=Math.floor(daysTracked/365);
const durationLabel=years>=1?`${years} year${years===1?'':'s'} with Tailtend`:`${daysTracked} day${daysTracked===1?'':'s'} with Tailtend`;
const photoUrl=pet.photo_path?db.storage.from('pet-photos').getPublicUrl(pet.photo_path).data.publicUrl:null;
const birthdays=birthdayMilestones(pet.birth_date).length;

return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',padding:70,background:'#F7F2E9',color:'#22303C',fontFamily:'sans-serif'}}>
<div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',flex:1}}>
<div style={{display:'flex',fontFamily:'monospace',fontSize:24,letterSpacing:3,textTransform:'uppercase',color:'#2F7D5B'}}>Tailtend · {pet.name}&apos;s story</div>
<div style={{display:'flex',flexDirection:'column',gap:14}}>
<div style={{display:'flex',fontSize:64,fontWeight:800,lineHeight:1.05}}>{durationLabel}</div>
<div style={{display:'flex',fontSize:28,color:'rgba(34,48,60,.7)'}}>{[milestoneCount?`${milestoneCount} milestone${milestoneCount===1?'':'s'}`:null,birthdays?`${birthdays} birthday${birthdays===1?'':'s'}`:null,doneCount?`${onTimeCount||0}/${doneCount} on time`:null].filter(Boolean).join(' · ')||'A record kept with care'}</div>
</div>
<div style={{display:'flex',justifyContent:'space-between',borderTop:'2px solid rgba(34,48,60,.18)',paddingTop:25,fontFamily:'monospace',fontSize:22}}><span>The record you can hand to anyone</span><span>tailtend.com</span></div>
</div>
{photoUrl&&<div style={{display:'flex',width:280,height:280,borderRadius:24,overflow:'hidden',marginLeft:40}}><img src={photoUrl} alt="" width={280} height={280} style={{objectFit:'cover'}}/></div>}
</div>,size)}
