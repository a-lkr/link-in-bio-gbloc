export type PremiumBackgroundStyle = 'none' | 'aurora' | 'stars' | 'rain' | 'film';
export type PremiumFontStyle = 'default' | 'prompt' | 'kanit' | 'chakra' | 'ibm-plex' | 'mitr';
export type PremiumTextEffect = 'none' | 'glow' | 'gradient' | 'fuzzy';

export type PremiumVisualPreview = {
  background: PremiumBackgroundStyle;
  backgroundStrength: number;
  font: PremiumFontStyle;
  textEffect: PremiumTextEffect;
  showProBadge: boolean;
  showCredit: boolean;
};

export type LocalBackgroundPreview = {
  url: string;
  type: 'image' | 'video';
  name: string;
  size: number;
};

export const initialPremiumVisualPreview: PremiumVisualPreview = {
  background: 'aurora',
  backgroundStrength: 55,
  font: 'prompt',
  textEffect: 'fuzzy',
  showProBadge: false,
  showCredit: true,
};
