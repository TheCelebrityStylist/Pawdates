type Point={recorded_at:string;weight_kg:number};

function sparkline(points:Point[],width:number,height:number,pad=8){
if(points.length<2)return null;
const weights=points.map(p=>p.weight_kg);
const min=Math.min(...weights),max=Math.max(...weights);
const range=max-min||1;
const step=(width-pad*2)/(points.length-1);
const coords=points.map((p,i)=>{
const x=pad+i*step;
const y=pad+(height-pad*2)*(1-(p.weight_kg-min)/range);
return `${x.toFixed(1)},${y.toFixed(1)}`;
});
return coords.join(' ');
}

export function WeightTrend({petName,points}:{petName:string;points:Point[]}){
if(points.length===0)return <p className="mt-6 text-sm text-black/60">No weight logged for {petName} yet — log a weight from the Edit page to start the trend.</p>;
if(points.length===1)return <p className="mt-6 text-sm text-black/60">{petName} has one weight logged: {points[0].weight_kg} kg on {new Date(points[0].recorded_at).toLocaleDateString('en-GB',{dateStyle:'medium'})}. Log another to see a trend.</p>;
const width=440,height=160;
const line=sparkline(points,width,height);
const first=points[0].weight_kg,last=points[points.length-1].weight_kg;
const delta=Math.round((last-first)*10)/10;
return <div className="mt-6">
<svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`${petName}'s weight trend`}>
<polyline points={line||''} fill="none" stroke="#2C7455" strokeWidth="2"/>
{points.map((p,i)=>{const step=(width-16)/(points.length-1);const x=8+i*step;const weights=points.map(pt=>pt.weight_kg);const min=Math.min(...weights),max=Math.max(...weights);const range=max-min||1;const y=8+(height-16)*(1-(p.weight_kg-min)/range);return <circle key={i} cx={x} cy={y} r="3" fill="#2C7455"/>})}
</svg>
<p className="mt-3 text-sm text-black/60">{first} kg → {last} kg over {points.length} log{points.length===1?'':'s'} ({delta>0?'+':''}{delta} kg)</p>
<div className="mt-4 space-y-1">{points.slice().reverse().map((p,i)=><div key={i} className="flex items-center justify-between text-sm"><span className="text-black/60">{new Date(p.recorded_at).toLocaleDateString('en-GB',{dateStyle:'medium'})}</span><span>{p.weight_kg} kg</span></div>)}</div>
</div>;
}
