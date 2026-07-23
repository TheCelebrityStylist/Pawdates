export type DogSize='small'|'medium'|'large'|'giant';
const perYearAfterTwo:Record<DogSize,number>={small:4,medium:5,large:6,giant:7};

// AVMA/AKC size-adjusted guideline: year 1 = 15 human years, year 2 adds 9
// more (24 total), each year after that adds 4-7 depending on dog size
// (cats use the flat +4/year band, matching published AVMA/AKC guidance).
export function humanYears(species:'dog'|'cat',size:DogSize,ageYears:number):number{
  if(ageYears<=0)return 0;
  if(ageYears<=1)return Math.round(15*ageYears*10)/10;
  if(ageYears<=2)return Math.round((15+9*(ageYears-1))*10)/10;
  const perYear=species==='cat'?4:perYearAfterTwo[size];
  return Math.round((24+perYear*(ageYears-2))*10)/10;
}
