export type BrandConfig = {
  primaryColor?: string
  onPrimary?: string
  accentColor?: string
  backgroundColor?: string
  surfaceColor?: string
  textColor?: string
  mutedColor?: string
  borderColor?: string
  logoUrl?: string
  fontFamily?: string
  headingFont?: string
  appTitle?: string
  tagline?: string
  heroImageUrl?: string
  heroHeadline?: string
  heroSubheadline?: string
  heroBadgeText?: string
  promoBannerText?: string
  buttonStyle?: 'rounded' | 'square'
  heroLayout?: 'immersive' | 'minimal'
  menuCardLayout?: 'classic' | 'compact' | 'photo-first'
  radius?: number
  showFeaturedBadges?: boolean
  showCategoryChips?: boolean
}

export const defaultBrand: BrandConfig = {
  primaryColor: '#0ea5e9',
  onPrimary: '#ffffff',
  appTitle: 'Order Online',
  buttonStyle: 'rounded'
}

export function mergeBrandConfig(base: BrandConfig, override?: BrandConfig): BrandConfig {
  return { ...base, ...(override || {}) }
}
