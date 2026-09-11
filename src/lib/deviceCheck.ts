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

  // 1. Median.co & GoNative specific identifiers
  const isMedianUserAgent = ua.includes('median') || ua.includes('gonative');
  const isMedianWindowObject = Boolean((window as any).median || (window as any).gonative);

  // 2. Android WebView & iOS WKWebView inside native wrapper
  const isAndroidWebView = ua.includes('wv') || (ua.includes('android') && ua.includes('version/'));
  const isIOSWebView = /(iphone|ipod|ipad).*applewebkit(?!.*safari)/i.test(navigator.userAgent);

  // 3. Custom Median App Identifier (can be configured in Median dashboard)
  const isCustomApp = ua.includes('pkarena') || ua.includes('pk_arena');

  return isMedianUserAgent || isMedianWindowObject || isAndroidWebView || isIOSWebView || isCustomApp;
};
