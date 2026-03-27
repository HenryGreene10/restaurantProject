export type BrandConfig = {
  primaryColor?: string
  onPrimary?: string
  logoUrl?: string
  fontFamily?: string
  appTitle?: string
  heroImageUrl?: string
  buttonStyle?: 'rounded' | 'square'
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
