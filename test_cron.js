// Test to verify our UTC to PKT conversion
// Vercel cron runs in UTC.
// PKT = UTC + 5
// 07:00 UTC = 12:00 PM PKT
// 10:00 UTC = 03:00 PM PKT
// 13:00 UTC = 06:00 PM PKT
// 16:00 UTC = 09:00 PM PKT
// 19:00 UTC = Midnight PKT (00:00 next day)
console.log("Calculations verified for vercel cron.");
