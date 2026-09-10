import axios from 'axios';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { appId, restApiKey, title, message, url, include_external_user_ids } = req.body || {};

  if (!appId || !restApiKey) {
    return res.status(400).json({ error: 'OneSignal App ID and REST API Key are required.' });
  }

  try {
    const payload: any = {
      app_id: appId,
      headings: { en: title },
      contents: { en: message },
      url: url || '',
    };

    if (Array.isArray(include_external_user_ids) && include_external_user_ids.length > 0) {
      payload.include_external_user_ids = include_external_user_ids;
      payload.channel_for_external_user_ids = 'push';
      payload.include_aliases = { external_id: include_external_user_ids };
      payload.target_channel = 'push';
    } else {
      payload.included_segments = ['All'];
    }

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      payload,
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Basic ${restApiKey}`,
        },
      }
    );

    return res.status(200).json({ success: true, data: response.data });
  } catch (error: any) {
    console.error('OneSignal Serverless Error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to send notification',
      details: error.response?.data || error.message,
    });
  }
}
