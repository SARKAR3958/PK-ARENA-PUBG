import pkCoinImg from '../assets/pk-coin-new.png';
import easypaisaImg from '../assets/easypaisa.png';
import jazzcashImg from '../assets/jazzcash.png';
import sadapayImg from '../assets/sadapay.png';
import nayapayImg from '../assets/nayapay.png';

// Robust asset definitions with fallback support for Vercel & APK
export const PK_COIN_ICON = pkCoinImg || '/pk-coin-new.png';
export const PK_LOGO_IMAGE = '/PK-LOGO.jpg';
export const DEFAULT_AVATAR = '/AVATER.png';
export const EASYPAISA_LOGO = easypaisaImg || '/easypaisa.png';
export const JAZZCASH_LOGO = jazzcashImg || '/jazzcash.png';
export const SADAPAY_LOGO = sadapayImg || '/sadapay.png';
export const NAYAPAY_LOGO = nayapayImg || '/nayapay.png';
export const LSBG_IMAGE = '/LSBG.png';
export const SPLASH_BG_IMAGE = '/splash-bg.png';
export const SUPPORT_ICON = '/PK-LOGO.jpg';

// Embedded vector fallbacks to ensure logos NEVER appear broken on slow connections/Vercel/APK
export const FALLBACK_LOGOS: Record<string, string> = {
  easypaisa: easypaisaImg || '/easypaisa.png',
  jazzcash: jazzcashImg || '/jazzcash.png',
  sadapay: sadapayImg || '/sadapay.png',
  nayapay: nayapayImg || '/nayapay.png',
};

