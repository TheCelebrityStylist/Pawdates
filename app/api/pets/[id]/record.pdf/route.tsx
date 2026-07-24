import QRCode from 'qrcode';import {Document,Image,Page,StyleSheet,Text,View,renderToBuffer} from '@react-pdf/renderer';import {z} from 'zod';import {sessionProfile} from '@/lib/access';import {fail} from '@/lib/http';import {siteUrl} from '@/lib/env';import type {Behaviour,Feeding,HouseLogistics} from '@/lib/care-profile';

const styles=StyleSheet.create({
page:{padding:48,paddingBottom:90,fontSize:11,fontFamily:'Helvetica',color:'#22303C'},
eyebrow:{fontSize:9,letterSpacing:2,textTransform:'uppercase',color:'#2F7D5B',marginBottom:8},
title:{fontSize:26,fontWeight:700,marginBottom:4},
meta:{fontSize:10,color:'#6B7280',marginBottom:16},
warning:{backgroundColor:'#FBEAE6',borderWidth:1,borderColor:'#BE3D2A',borderRadius:6,padding:10,marginBottom:16},
warningLabel:{fontSize:9,letterSpacing:1,textTransform:'uppercase',color:'#BE3D2A',marginBottom:3},
warningText:{fontSize:11,fontWeight:700,color:'#22303C'},
sectionTitle:{fontSize:13,fontWeight:700,marginTop:16,marginBottom:6,borderBottomWidth:1,borderBottomColor:'#E5E1D8',paddingBottom:4},
p:{fontSize:10,color:'#22303C',marginBottom:3,lineHeight:1.4},
row:{flexDirection:'row',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#E5E1D8',paddingVertical:8},
rowName:{fontSize:11,fontWeight:700},
rowMeta:{fontSize:9,color:'#6B7280',marginTop:2},
footer:{position:'absolute',bottom:36,left:48,right:48,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderTopWidth:1,borderTopColor:'#E5E1D8',paddingTop:12},
footerText:{fontSize:9,color:'#6B7280'},
qr:{width:56,height:56}
});

type TreatmentRow={id:string;name:string;last_given:string;next_due:string;product_name:string|null};
type RoutineRow={id:string;time:string;label:string;category:string};

function RecordPdf({petName,species,treatments,routineItems,essentialsFlag,forbiddenFoods,feeding,behaviour,houseLogistics,linkUrl,shared,qrDataUrl}:{petName:string;species:string;treatments:TreatmentRow[];routineItems:RoutineRow[];essentialsFlag:string|null;forbiddenFoods:string[];feeding:Feeding;behaviour:Behaviour;houseLogistics:HouseLogistics;linkUrl:string;shared:boolean;qrDataUrl:string}){
return <Document><Page size="A4" style={styles.page}>
<Text style={styles.eyebrow}>Tailtend · Care handover</Text>
<Text style={styles.title}>{petName}&apos;s record</Text>
<Text style={styles.meta}>{species} · generated {new Date().toLocaleDateString('en-GB',{dateStyle:'long'})}</Text>

{essentialsFlag&&<View style={styles.warning}><Text style={styles.warningLabel}>Read this first</Text><Text style={styles.warningText}>{essentialsFlag}</Text></View>}
{forbiddenFoods.length>0&&<View style={styles.warning}><Text style={styles.warningLabel}>Strictly no</Text><Text style={styles.warningText}>{forbiddenFoods.join(', ')}</Text></View>}

{(houseLogistics.vetName||houseLogistics.vetPhone)&&<><Text style={styles.sectionTitle}>Vet / emergency contact</Text><Text style={styles.p}>{[houseLogistics.vetName,houseLogistics.vetPhone].filter(Boolean).join(' · ')}</Text></>}

{routineItems.length>0&&<><Text style={styles.sectionTitle}>Today&apos;s timeline</Text>{routineItems.map(i=><View style={styles.row} key={i.id}><Text style={{fontSize:10}}>{i.time}</Text><Text style={{fontSize:10}}>{i.label}</Text></View>)}</>}

{(feeding.brand||feeding.amountPerMeal||feeding.serveNotes)&&<><Text style={styles.sectionTitle}>Food &amp; feeding</Text>
{feeding.brand&&<Text style={styles.p}>{feeding.product?`${feeding.brand} — ${feeding.product}`:feeding.brand}</Text>}
{feeding.amountPerMeal&&<Text style={styles.p}>{feeding.amountPerMeal}{feeding.mealsPerDay?` · ${feeding.mealsPerDay}x per day`:''}{(feeding.feedingTimes||[]).length?` · ${(feeding.feedingTimes||[]).join(', ')}`:''}</Text>}
{feeding.serveNotes&&<Text style={styles.p}>{feeding.serveNotes}</Text>}
{feeding.treatsAllowed&&<Text style={styles.p}>Treats: {feeding.treatsAllowed}</Text>}
</>}

{(behaviour.personality||behaviour.fearsTriggers)&&<><Text style={styles.sectionTitle}>Behaviour</Text>
{behaviour.personality&&<Text style={styles.p}>{behaviour.personality}</Text>}
{behaviour.fearsTriggers&&<Text style={styles.p}>Fears &amp; triggers: {behaviour.fearsTriggers}</Text>}
{behaviour.comfort&&<Text style={styles.p}>What calms them: {behaviour.comfort}</Text>}
</>}

<Text style={styles.sectionTitle}>Treatment record</Text>
{treatments.map(t=><View style={styles.row} key={t.id}>
<View><Text style={styles.rowName}>{t.name}</Text><Text style={styles.rowMeta}>{t.product_name?`${t.product_name} · `:''}Last given {new Date(t.last_given).toLocaleDateString('en-GB',{dateStyle:'medium'})}</Text></View>
<Text style={{fontSize:10}}>Next due {new Date(t.next_due).toLocaleDateString('en-GB',{dateStyle:'medium'})}</Text>
</View>)}

<View style={styles.footer}>
<View><Text style={styles.footerText}>{shared?'Live, always up to date at:':'Tracked with Tailtend'}</Text><Text style={styles.footerText}>{linkUrl}</Text></View>
<Image style={styles.qr} src={qrDataUrl}/>
</View>
</Page></Document>}

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
try{
const session=await sessionProfile();if(!session)return fail('unauthorized','Sign in required',401);
const {id}=await params;if(!z.string().uuid().safeParse(id).success)return fail('invalid_id','Invalid pet');
const {data:pet,error:petError}=await session.client.from('pets').select('id,name,species,share_token,share_enabled').eq('id',id).single();
if(petError||!pet)return fail('not_found','Pet not found',404);
const [{data:treatments},{data:profile},{data:routineItems}]=await Promise.all([
session.client.from('treatments').select('id,name,last_given,next_due,product_name').eq('pet_id',id).order('next_due'),
session.client.from('pet_profile').select('essentials_flag,forbidden_foods,feeding,behaviour,house_logistics').eq('pet_id',id).maybeSingle(),
session.client.from('routine_items').select('id,time,label,category').eq('pet_id',id).order('sort_order').order('time')
]);

const linkUrl=pet.share_enabled?`${siteUrl()}/share/${pet.share_token}`:siteUrl();
const qrDataUrl=await QRCode.toDataURL(linkUrl,{margin:1,width:200});

const buffer=await renderToBuffer(<RecordPdf
petName={pet.name} species={pet.species}
treatments={(treatments||[]) as TreatmentRow[]}
routineItems={(routineItems||[]) as RoutineRow[]}
essentialsFlag={profile?.essentials_flag||null}
forbiddenFoods={profile?.forbidden_foods||[]}
feeding={(profile?.feeding||{}) as Feeding}
behaviour={(profile?.behaviour||{}) as Behaviour}
houseLogistics={(profile?.house_logistics||{}) as HouseLogistics}
linkUrl={linkUrl} shared={pet.share_enabled} qrDataUrl={qrDataUrl}/>);
return new Response(new Uint8Array(buffer),{headers:{'content-type':'application/pdf','content-disposition':`attachment; filename="${pet.name.replace(/[^a-z0-9]/gi,'-')}-tailtend-record.pdf"`}});
}catch(e){return fail('pdf_failed',e instanceof Error?e.message:'PDF generation failed',500)}
}
