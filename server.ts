import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";

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

    // Server-level browser check
    app.use((req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.query.access === 'admin') {
        return next();
      }
      const ua = (req.headers['user-agent'] || '').toLowerCase();
      const isMedian = ua.includes('median') || ua.includes('gonative');
      const isWebView = ua.includes('wv') || (ua.includes('android') && ua.includes('version/')) || (/(iphone|ipod|ipad).*applewebkit(?!.*safari)/i.test(ua));
      const isApp = ua.includes('pkarena') || ua.includes('pk_arena');

      if (!isMedian && !isWebView && !isApp) {
        return res.status(404).send('<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="background:#0e0e10;color:#fff;font-family:monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;"><h1 style="font-size:32px;margin:0 0 8px 0;letter-spacing:2px;color:#ff4444;">404 | ACCESS DENIED</h1><p style="color:#888;font-size:14px;max-width:360px;">This server resource cannot be accessed directly from web browsers. Please launch the official APK mobile application.</p><div style="margin-top:20px;font-size:11px;color:#555;border-top:1px solid #222;padding-top:10px;">ERR_RESTRICTED_CLIENT_PLATFORM</div></body></html>');
      }
      next();
    });

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
