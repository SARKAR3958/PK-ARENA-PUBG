import pkCoinImg from '../assets/pk-coin-new.png';

// Robust asset definitions with fallback support for Vercel & APK
export const PK_COIN_ICON = pkCoinImg || '/pk-coin-new.png';
export const PK_LOGO_IMAGE = '/PK-LOGO.jpg';
export const DEFAULT_AVATAR = '/AVATER.png';
export const EASYPAISA_LOGO = '/easypaisa.png';
export const JAZZCASH_LOGO = '/jazzcash.png';
export const SADAPAY_LOGO = '/sadapay.png';
export const NAYAPAY_LOGO = '/nayapay.png';
export const LSBG_IMAGE = '/LSBG.png';
export const SPLASH_BG_IMAGE = '/splash-bg.png';
export const SUPPORT_ICON = '/PK-LOGO.jpg';

// Embedded vector fallbacks to ensure logos NEVER appear broken on slow connections/Vercel/APK
export const FALLBACK_LOGOS: Record<string, string> = {
  easypaisa: '/easypaisa.png',
  jazzcash: '/jazzcash.png',
  sadapay: '/sadapay.png',
  nayapay: '/nayapay.png',
};

