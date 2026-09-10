import OneSignal from 'react-onesignal';

// Helper to detect if running inside Median/GoNative wrapper app
export const isMedianApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    !!(window as any).median ||
    !!(window as any).gonative ||
    ua.includes('gonative') ||
    ua.includes('median')
  );
};

// Initialize OneSignal based on environment
export const initOneSignal = async (dbAppId?: string) => {
  const appId = dbAppId || import.meta.env.VITE_ONESIGNAL_APP_ID;
  
  if (!appId) {
    console.log('OneSignal App ID missing. Push notifications disabled.');
    return;
  }

  // If running inside Median (GoNative) container, DO NOT initialize standard Web Push.
  // Standard Web Push requires a Service Worker and Web Configuration, which will fail
  // with "App not configured for web push" on mobile webviews.
  if (isMedianApp()) {
    console.log('Median/GoNative app detected. Bypassing Web Push SDK, relying on native bridge.');
    try {
      // Trigger native registration in Median
      if ((window as any).median?.onesignal) {
        (window as any).median.onesignal.register();
      } else if ((window as any).gonative?.onesignal) {
        (window as any).gonative.onesignal.register();
      } else {
        // Fallback to URL-based command scheme
        window.location.href = "gonative://onesignal/register";
      }
    } catch (e) {
      console.warn('Failed to call native registration bridge:', e);
    }
    return;
  }

  // Standalone/regular browser web push initialization (silently handled)
  try {
    await OneSignal.init({
      appId: appId,
      allowLocalhostAsSecureOrigin: true,
      autoRegister: false, // Don't annoy users with automatic prompts unless requested
    });
    console.log('Web OneSignal initialized successfully.');
  } catch (error: any) {
    // Gracefully catch "App not configured for web push" or other service worker missing warnings
    console.warn('OneSignal Web Push skipped or failed:', error?.message || error);
  }
};

// Associate a logged-in user with OneSignal for targeted push notifications
export const registerUserWithOneSignal = (userId: string, email?: string) => {
  if (!userId) return;

  if (isMedianApp()) {
    console.log('Registering user in Median/GoNative app:', userId);
    try {
      // 1. Set External User ID (allows targeting push by user ID)
      if ((window as any).median?.onesignal?.setExternalUserId) {
        (window as any).median.onesignal.setExternalUserId(userId);
      } else if ((window as any).gonative?.onesignal?.setExternalUserId) {
        (window as any).gonative.onesignal.setExternalUserId(userId);
      } else {
        // Fallback using Deep Link URL Scheme
        window.location.href = `gonative://onesignal/externalUserId/set?id=${encodeURIComponent(userId)}`;
      }

      // 2. Set tags (useful for custom segment targeting)
      const tags = { userId, ...(email ? { email } : {}) };
      if ((window as any).median?.onesignal?.sendTags) {
        (window as any).median.onesignal.sendTags(tags);
      } else if ((window as any).gonative?.onesignal?.sendTags) {
        (window as any).gonative.onesignal.sendTags(tags);
      } else {
        window.location.href = `gonative://onesignal/tags/set?tags=${encodeURIComponent(JSON.stringify(tags))}`;
      }
    } catch (e) {
      console.warn('Failed to send user details to Median native bridge:', e);
    }
  } else {
    // Regular web-push SDK set external user id
    try {
      const os = OneSignal as any;
      if (os.setExternalUserId) {
        os.setExternalUserId(userId).catch((err: any) => {
          console.debug('Web OneSignal setExternalUserId skipped:', err);
        });
      } else if (os.login) {
        os.login(userId).catch((err: any) => {
          console.debug('Web OneSignal login skipped:', err);
        });
      }
    } catch (e) {
      // Catch any synchronous library errors
    }
  }
};
