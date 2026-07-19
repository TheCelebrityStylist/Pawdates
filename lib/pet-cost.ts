export type WeightBand='small'|'medium'|'large';
export type ProductType='flea'|'worming'|'both';

// Annual ranges are consistent with the estimates already published in
// /blog/annual-pet-care-costs (dog flea/tick €100-250/yr, worming €30-80/yr;
// cat combined €150-300/yr) — this tool just splits them by weight band and
// product choice rather than inventing new figures.
const dogFlea:Record<WeightBand,number>={small:100,medium:160,large:220};
const dogWorming=50;
const catFlea=90;
const catWorming=40;

export function annualCost(species:'dog'|'cat',band:WeightBand,product:ProductType):number{
const flea=species==='cat'?catFlea:dogFlea[band];
const worming=species==='cat'?catWorming:dogWorming;
if(product==='flea')return flea;
if(product==='worming')return worming;
return flea+worming;
}

// A lapsed schedule that becomes a home infestation "routinely costs several
// times a full year of prevention" per /blog/missed-flea-treatment — shown
// as an order-of-magnitude range (3-6x), not a precise figure.
export function missedRange(annual:number):[number,number]{return [Math.round(annual*3),Math.round(annual*6)]}
