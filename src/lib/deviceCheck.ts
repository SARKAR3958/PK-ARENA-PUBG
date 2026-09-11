/**
 * Utility to detect whether the user is opening the app inside Median.co APK / Native WebView
 */
export const isMedianApp = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Allow bypass for admin route, local development or bypass query param
  const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('ais-dev');
  const isAdminRoute = window.location.pathname.startsWith('/admin');
  const hasBypassParam = new URLSearchParams(window.location.search).get('access') === 'admin';
  const hasBypassStorage = sessionStorage.getItem('admin_bypass_verified') === 'true';

  if (hasBypassParam) {
    sessionStorage.setItem('admin_bypass_verified', 'true');
    return true;
  }

  if (isAdminRoute || hasBypassStorage || isDev) {
    return true;
  }

  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();

  // Desktop PC checks
  const isWindowsPC = ua.includes('windows nt');
  const isMacDesktop = ua.includes('macintosh') && !('ontouchend' in document) && navigator.maxTouchPoints <= 1;
  const isLinuxDesktop = ua.includes('x11') && !ua.includes('android');
  const isDesktop = (isWindowsPC || isMacDesktop || isLinuxDesktop) && !ua.includes('android') && !ua.includes('mobile');

  // Mobile / APK / Median / Android checks
  const isMobileOrApp = ua.includes('android') || ua.includes('mobile') || ua.includes('iphone') || ua.includes('ipad') || ua.includes('median') || ua.includes('gonative') || ua.includes('wv') || Boolean((window as any).median || (window as any).gonative);

  return !isDesktop && isMobileOrApp;
};
