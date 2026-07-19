import QRCode from 'qrcode';import {Document,Image,Page,StyleSheet,Text,View,renderToBuffer} from '@react-pdf/renderer';import {z} from 'zod';import {sessionProfile} from '@/lib/access';import {fail} from '@/lib/http';import {siteUrl} from '@/lib/env';

const styles=StyleSheet.create({
page:{padding:48,fontSize:11,fontFamily:'Helvetica',color:'#22303C'},
eyebrow:{fontSize:9,letterSpacing:2,textTransform:'uppercase',color:'#2F7D5B',marginBottom:8},
title:{fontSize:26,fontWeight:700,marginBottom:4},
meta:{fontSize:10,color:'#6B7280',marginBottom:24},
row:{flexDirection:'row',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#E5E1D8',paddingVertical:10},
rowName:{fontSize:12,fontWeight:700},
rowMeta:{fontSize:9,color:'#6B7280',marginTop:2},
footer:{position:'absolute',bottom:36,left:48,right:48,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderTopWidth:1,borderTopColor:'#E5E1D8',paddingTop:12},
footerText:{fontSize:9,color:'#6B7280'},
qr:{width:56,height:56}
});

type TreatmentRow={id:string;name:string;last_given:string;next_due:string;product_name:string|null};

function RecordPdf({petName,species,treatments,linkUrl,shared,qrDataUrl}:{petName:string;species:string;treatments:TreatmentRow[];linkUrl:string;shared:boolean;qrDataUrl:string}){
return <Document><Page size="A4" style={styles.page}>
<Text style={styles.eyebrow}>Tailtend · Treatment record</Text>
<Text style={styles.title}>{petName}&apos;s record</Text>
<Text style={styles.meta}>{species} · generated {new Date().toLocaleDateString('en-GB',{dateStyle:'long'})}</Text>
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
const {data:treatments}=await session.client.from('treatments').select('id,name,last_given,next_due,product_name').eq('pet_id',id).order('next_due');

const linkUrl=pet.share_enabled?`${siteUrl()}/share/${pet.share_token}`:siteUrl();
const qrDataUrl=await QRCode.toDataURL(linkUrl,{margin:1,width:200});

const buffer=await renderToBuffer(<RecordPdf petName={pet.name} species={pet.species} treatments={(treatments||[]) as TreatmentRow[]} linkUrl={linkUrl} shared={pet.share_enabled} qrDataUrl={qrDataUrl}/>);
return new Response(new Uint8Array(buffer),{headers:{'content-type':'application/pdf','content-disposition':`attachment; filename="${pet.name.replace(/[^a-z0-9]/gi,'-')}-tailtend-record.pdf"`}});
}catch(e){return fail('pdf_failed',e instanceof Error?e.message:'PDF generation failed',500)}
}
