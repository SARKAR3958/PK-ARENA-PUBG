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
