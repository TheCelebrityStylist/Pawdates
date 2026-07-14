export type PremiumProfile = {
  is_premium: boolean;
  premium_until: string | null;
};

export function isPremium(profile: PremiumProfile | null | undefined) {
  return Boolean(
    profile?.is_premium &&
      profile.premium_until &&
      new Date(profile.premium_until).getTime() > Date.now(),
  );
}
