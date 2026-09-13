import axios from 'axios';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const dbUrl = "https://pak-arena-new-default-rtdb.firebaseio.com";
  try {
    const dateFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi' });
    const dateString = dateFormatter.format(new Date());
    
    const resetRes = await axios.get(`${dbUrl}/systemSettings/lastDailyReset.json`);
    if (resetRes.data !== dateString) {
      // Clear notifications
      await axios.delete(`${dbUrl}/notifications.json`);
      await axios.delete(`${dbUrl}/userNotifications.json`);
      // Update lock
      await axios.put(`${dbUrl}/systemSettings/lastDailyReset.json`, JSON.stringify(dateString));
      return res.status(200).json({ success: true, message: "Daily notification reset complete", date: dateString });
    }
    return res.status(200).json({ message: "Already reset today" });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
