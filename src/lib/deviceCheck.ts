/**
 * Utility to detect whether the user is opening the app inside Median.co APK / Native WebView
 */
export const isMedianApp = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Allow bypass for iframe preview, admin route, local development or bypass query param
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const host = window.location.hostname || '';
  const isDev = isIframe || host === 'localhost' || host.includes('run.app') || host.includes('google') || host.includes('ais-') || host.includes('127.0.0.1');
  const isAdminRoute = window.location.pathname.startsWith('/admin');
  const search = window.location.search || '';
  const hasAppParam = search.includes('app=pkarena') || search.includes('access=admin') || search.includes('platform=apk');
  const hasBypassStorage = sessionStorage.getItem('app_verified') === 'true' || sessionStorage.getItem('admin_bypass_verified') === 'true';

  if (hasAppParam) {
    sessionStorage.setItem('app_verified', 'true');
    return true;
  }

  if (isAdminRoute || hasBypassStorage || isDev) {
    return true;
  }

  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();

  // 1. Median.co & GoNative identifiers
  const isMedianUserAgent = ua.includes('median') || ua.includes('gonative') || ua.includes('pkarena') || ua.includes('pk_arena');
  const isMedianWindowObject = Boolean((window as any).median || (window as any).gonative);

  // 2. Android WebView & iOS WKWebView
  const isAndroidWebView = ua.includes('wv') || (ua.includes('android') && ua.includes('version/'));
  const isIOSWebView = /(iphone|ipod|ipad).*applewebkit(?!.*safari)/i.test(navigator.userAgent);

  return isMedianUserAgent || isMedianWindowObject || isAndroidWebView || isIOSWebView;
};

