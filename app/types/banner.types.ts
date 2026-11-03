export type BannerDisplayMode = 'overlay' | 'image-only';

export type BannerTextAlignment = 'left' | 'center' | 'right';

export type BannerOverlayDarkness = 'light' | 'medium' | 'dark' | 'none';

export interface HeroBannerItem {
  id: string;
  isActive: boolean;
  displayMode: BannerDisplayMode;
  title: string;
  badge?: string;
  subtitle?: string;
  imageDesktop: string;
  imageMobile?: string;
  ctaText?: string;
  ctaLink: string;
  secondaryText?: string;
  secondaryLink?: string;
  textAlignment?: BannerTextAlignment;
  overlayDarkness?: BannerOverlayDarkness;
}
