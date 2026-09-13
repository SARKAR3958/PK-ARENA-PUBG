import axios from 'axios';

export default async function handler(req: any, res: any) {
  // Allow GET and POST for cron
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dbUrl = "https://pak-arena-new-default-rtdb.firebaseio.com";
    
    // Format current time in PKT
    const dateFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi' });
    const hourFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: false });
    
    const now = new Date();
    const dateString = dateFormatter.format(now);
    const hour = parseInt(hourFormatter.format(now), 10);
    
    const pushKey = `${dateString}-${hour}`;
    
    // Check if push already sent for this specific hour (prevents duplicate triggers)
    const pushRes = await axios.get(`${dbUrl}/systemSettings/lastAutoPush.json`);
    if (pushRes.data === pushKey) {
       return res.status(200).json({ message: "Push already sent for this hour", key: pushKey });
    }
    
    // Lock it immediately
    await axios.put(`${dbUrl}/systemSettings/lastAutoPush.json`, JSON.stringify(pushKey));

    // Fetch settings directly from database
    const dbRes = await axios.get(`${dbUrl}/appSettings.json`);
    const appSettings = dbRes.data;
    
    if (!appSettings || !appSettings.onesignalAppId || !appSettings.onesignalRestApiKey) {
      return res.status(500).json({ error: "Missing OneSignal config" });
    }

    const getNotificationForHour = (targetHour: number) => {
      switch (targetHour) {
        case 12:
          return {
            title: "🔥 PK ARENA PUBG",
            message: "Don't miss today's exciting matches!"
          };
        case 15:
          return {
            title: "🏆 Your Next Victory Awaits!",
            message: "Open PK ARENA PUBG and start playing."
          };
        case 18:
          return {
            title: "🎯 The Battle Is On!",
            message: "Jump now in PK ARENA PUBG, play hard, and show them what you’ve got"
          };
        case 21:
          return {
            title: "💎 One More Battle Tonight?",
            message: "Your next win could be waiting. Come back and play!"
          };
        default:
          return {
            title: "🔥 PK ARENA PUBG",
            message: "Don't miss today's exciting matches!"
          };
      }
    };

    const scheduledPush = getNotificationForHour(hour);

    // Send to OneSignal
    const payload = {
      app_id: appSettings.onesignalAppId,
      headings: { en: scheduledPush.title },
      contents: { en: scheduledPush.message },
      included_segments: ["All"],
    };

    const response = await axios.post(
      "https://onesignal.com/api/v1/notifications",
      payload,
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Basic ${appSettings.onesignalRestApiKey}`,
        },
      }
    );

    // Log to Firebase admin history
    await axios.post(`${dbUrl}/adminNotificationHistory.json`, {
      title: scheduledPush.title,
      message: scheduledPush.message,
      type: "AUTO",
      target: "ALL",
      createdAt: Date.now()
    });

    return res.status(200).json({ success: true, message: `Auto notification sent for ${hour} PM PKT`, data: response.data });
  } catch (error: any) {
    console.error("Cron Push Error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Failed to send auto notification", details: error.message });
  }
}
