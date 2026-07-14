export type LifeStage = 'puppy' | 'adult' | 'senior'

export function lifeStage(ageYears: number, species: 'dog' | 'cat'): LifeStage {
  const seniorAt = species === 'cat' ? 11 : 8
  if (ageYears < 1) return 'puppy'
  if (ageYears >= seniorAt) return 'senior'
  return 'adult'
}

export function lifeStageSuggestion(stage: LifeStage) {
  if (stage === 'puppy') return { key: 'first-year-plan', title: 'Build a first-year care plan', body: 'Young pets often have more frequent vaccines, parasite checks and weight changes. Add the dates your vet gives you.' }
  if (stage === 'senior') return { key: 'senior-check', title: 'Consider a senior wellness check', body: 'A yearly check can help catch age-related changes early. Add the visit when you book it.' }
  return null
}
