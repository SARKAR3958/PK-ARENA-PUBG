
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import cron from "node-cron";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API to send OneSignal notifications
  app.post("/api/send-notification", async (req, res) => {
    const { appId, restApiKey, title, message, url, include_external_user_ids } = req.body;

    if (!appId || !restApiKey) {
      return res.status(400).json({ error: "OneSignal App ID and REST API Key are required." });
    }

    try {
      const payload: any = {
        app_id: appId,
        headings: { en: title },
        contents: { en: message },
        url: url || "",
      };

      if (Array.isArray(include_external_user_ids) && include_external_user_ids.length > 0) {
        payload.include_external_user_ids = include_external_user_ids;
        payload.channel_for_external_user_ids = "push";
        payload.include_aliases = { "external_id": include_external_user_ids };
        payload.target_channel = "push";
      } else {
        payload.included_segments = ["All"];
      }

      const response = await axios.post(
        "https://onesignal.com/api/v1/notifications",
        payload,
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Basic ${restApiKey}`,
          },
        }
      );

      res.json({ success: true, data: response.data });
    } catch (error: any) {
      console.error("OneSignal Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to send notification", details: error.response?.data });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Auto Notifications Logic
const dbUrl = "https://pak-arena-new-default-rtdb.firebaseio.com";

const sendScheduledPush = async (hour) => {
  try {
    // Check lock to avoid duplicates if container scales
    const dateFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi' });
    const dateString = dateFormatter.format(new Date());
    const pushKey = `${dateString}-${hour}`;
    
    const pushRes = await axios.get(`${dbUrl}/systemSettings/lastAutoPush.json`);
    if (pushRes.data === pushKey) {
       console.log("Push already sent for", pushKey);
       return;
    }
    
    // Lock it
    await axios.put(`${dbUrl}/systemSettings/lastAutoPush.json`, JSON.stringify(pushKey));

    const dbRes = await axios.get(`${dbUrl}/appSettings.json`);
    const appSettings = dbRes.data;
    if (!appSettings || !appSettings.onesignalAppId || !appSettings.onesignalRestApiKey) {
      console.log("Missing OneSignal config for auto push");
      return;
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

    const scheduledPush = getNotificationForHour(Number(hour));

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
    
    // Store in global in-app notifications (for user notification bell modal)
    await axios.post(`${dbUrl}/notifications.json`, {
      title: scheduledPush.title,
      message: scheduledPush.message,
      url: "",
      type: "AUTO_BROADCAST",
      createdAt: Date.now()
    });

    await axios.post(`${dbUrl}/adminNotificationHistory.json`, {
      title: scheduledPush.title,
      message: scheduledPush.message,
      type: "AUTO",
      target: "ALL",
      createdAt: Date.now()
    });

    console.log(`Successfully sent auto notification for ${hour} PM PKT`, response.data);
  } catch (error) {
    console.error("Scheduled push error:", error.response?.data || error.message);
  }
};

const runDailyReset = async () => {
    try {
        const dateFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi' });
        const dateString = dateFormatter.format(new Date());
        
        const resetRes = await axios.get(`${dbUrl}/systemSettings/lastDailyReset.json`);
        if (resetRes.data !== dateString) {
            await axios.delete(`${dbUrl}/notifications.json`);
            await axios.delete(`${dbUrl}/userNotifications.json`);
            await axios.put(`${dbUrl}/systemSettings/lastDailyReset.json`, JSON.stringify(dateString));
            console.log("Daily notification reset complete for", dateString);
        }
    } catch (e) {
        console.error("Reset error", e.message);
    }
};

// Schedule for exactly 12 PM PKT (Asia/Karachi)
cron.schedule("0 12 * * *", () => sendScheduledPush(12), { timezone: "Asia/Karachi" });

// Schedule for exactly 3 PM (15:00) PKT
cron.schedule("0 15 * * *", () => sendScheduledPush(15), { timezone: "Asia/Karachi" });

// Schedule for exactly 6 PM (18:00) PKT
cron.schedule("0 18 * * *", () => sendScheduledPush(18), { timezone: "Asia/Karachi" });

// Schedule for exactly 9 PM (21:00) PKT
cron.schedule("0 21 * * *", () => sendScheduledPush(21), { timezone: "Asia/Karachi" });

// Schedule daily reset at exactly Midnight (00:00) PKT
cron.schedule("0 0 * * *", () => runDailyReset(), { timezone: "Asia/Karachi" });

startServer();
