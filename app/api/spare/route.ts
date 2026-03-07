// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/mongodb';
// import Task from '@/lib/models/Task';

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface YoutubeVideo {
//     title: string;
//     url: string;
//     channel: string;
//     publishedAt: Date;
// }

// interface GmailMessage {
//     subject: string;
//     from: string;
//     snippet: string;
//     receivedAt: Date;
// }

// // ─── YouTube RSS helpers ───────────────────────────────────────────────────────

// const YOUTUBE_CHANNELS: { handle: string; channelId: string }[] = [
//     // Channel IDs for RSS — find yours at: https://commentpicker.com/youtube-channel-id.php
//     { handle: 'JavaScript Mastery', channelId: 'UCmXmlB4-HJytD7wek0Uo97A' },
//     { handle: "It's Jack", channelId: 'UCVRBCvTBT8MxObAogMqkArQ' },
// ];

// async function fetchNewYouTubeVideos(sinceHours = 25): Promise<YoutubeVideo[]> {
//     const cutoff = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
//     const videos: YoutubeVideo[] = [];

//     for (const ch of YOUTUBE_CHANNELS) {
//         try {
//             const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`;
//             const res = await fetch(rssUrl, { next: { revalidate: 0 } });
//             if (!res.ok) continue;

//             const xml = await res.text();

//             // Parse <entry> blocks from the Atom feed
//             const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];

//             for (const entry of entries) {
//                 const title = entry.match(/<title>(.*?)<\/title>/)?.[1] ?? 'Untitled';
//                 const link = entry.match(/<link rel="alternate"[^>]+href="([^"]+)"/)?.[1] ?? '';
//                 const pubStr = entry.match(/<published>(.*?)<\/published>/)?.[1] ?? '';
//                 const pubDate = pubStr ? new Date(pubStr) : new Date(0);

//                 if (pubDate >= cutoff) {
//                     videos.push({
//                         title: decodeXmlEntities(title),
//                         url: link,
//                         channel: ch.handle,
//                         publishedAt: pubDate,
//                     });
//                 }
//             }
//         } catch (err) {
//             console.error(`YouTube RSS fetch failed for ${ch.handle}:`, err);
//         }
//     }

//     return videos;
// }

// function decodeXmlEntities(str: string): string {
//     return str
//         .replace(/&amp;/g, '&')
//         .replace(/&lt;/g, '<')
//         .replace(/&gt;/g, '>')
//         .replace(/&quot;/g, '"')
//         .replace(/&#39;/g, "'");
// }

// // ─── Gmail API helpers ─────────────────────────────────────────────────────────
// // Requires these env vars:
// //   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
// // Get them from: https://console.cloud.google.com → OAuth 2.0 → Gmail API
// // Use OAuth Playground (https://developers.google.com/oauthplayground) to get
// // a refresh token with scope: https://www.googleapis.com/auth/gmail.readonly

// async function getGmailAccessToken(): Promise<string> {
//     const res = await fetch('https://oauth2.googleapis.com/token', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//         body: new URLSearchParams({
//             client_id: process.env.GMAIL_CLIENT_ID!,
//             client_secret: process.env.GMAIL_CLIENT_SECRET!,
//             refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
//             grant_type: 'refresh_token',
//         }),
//     });
//     if (!res.ok) throw new Error('Failed to refresh Gmail access token');
//     const data = await res.json();
//     return data.access_token as string;
// }

// async function fetchNewGmailMessages(sinceHours = 25): Promise<GmailMessage[]> {
//     if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
//         console.warn('Gmail env vars not set — skipping email fetch.');
//         return [];
//     }

//     try {
//         const accessToken = await getGmailAccessToken();
//         const since = Math.floor((Date.now() - sinceHours * 60 * 60 * 1000) / 1000);

//         // List message IDs received since cutoff
//         const listRes = await fetch(
//             `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:${since}&maxResults=10`,
//             { headers: { Authorization: `Bearer ${accessToken}` } }
//         );
//         if (!listRes.ok) throw new Error('Gmail list failed');
//         const listData = await listRes.json();
//         const messageIds: string[] = (listData.messages ?? []).map((m: { id: string }) => m.id);

//         const messages: GmailMessage[] = [];

//         for (const id of messageIds) {
//             const msgRes = await fetch(
//                 `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
//                 { headers: { Authorization: `Bearer ${accessToken}` } }
//             );
//             if (!msgRes.ok) continue;
//             const msg = await msgRes.json();

//             const headers: { name: string; value: string }[] = msg.payload?.headers ?? [];
//             const subject = headers.find(h => h.name === 'Subject')?.value ?? '(no subject)';
//             const from = headers.find(h => h.name === 'From')?.value ?? 'Unknown';
//             const dateStr = headers.find(h => h.name === 'Date')?.value ?? '';

//             messages.push({
//                 subject,
//                 from: sanitizeSender(from),
//                 snippet: msg.snippet ?? '',
//                 receivedAt: dateStr ? new Date(dateStr) : new Date(),
//             });
//         }

//         return messages;
//     } catch (err) {
//         console.error('Gmail fetch error:', err);
//         return [];
//     }
// }

// function sanitizeSender(from: string): string {
//     // Extract display name if present: "John Doe <john@example.com>" → "John Doe"
//     const match = from.match(/^"?([^"<]+)"?\s*</);
//     return match ? match[1].trim() : from;
// }

// // ─── Telegram helper ───────────────────────────────────────────────────────────

// async function sendTelegramMessage(token: string, chatId: string, text: string) {
//     const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
//     });
//     if (!res.ok) {
//         const err = await res.json();
//         throw new Error(`Telegram API error: ${JSON.stringify(err)}`);
//     }
//     return res.json();
// }

// // ─── Message builder ───────────────────────────────────────────────────────────

// function buildMorningMessage(params: {
//     dateStr: string;
//     tasks: { text: string; dueDate: Date | null }[];
//     videos: YoutubeVideo[];
//     emails: GmailMessage[];
// }): string {
//     const { dateStr, tasks, videos, emails } = params;

//     const sections: string[] = [];

//     sections.push(`🌅 *Good morning! Daily Digest*\n📅 ${dateStr}`);

//     // ── Tasks ────────────────────────────────────────────────────────────────
//     if (tasks.length === 0) {
//         sections.push(`✅ *Tasks*\nNo tasks due today\\. Enjoy your day\\! 🎉`);
//     } else {
//         const taskLines = tasks
//             .map((t, i) => {
//                 const label = t.dueDate ? `_(due today)_` : `_(pending)_`;
//                 return `${i + 1}\\. ${escapeMd(t.text)} ${label}`;
//             })
//             .join('\n');
//         sections.push(`📋 *Tasks \\(${tasks.length}\\)*\n${taskLines}`);
//     }

//     // ── YouTube ──────────────────────────────────────────────────────────────
//     if (videos.length > 0) {
//         const videoLines = videos
//             .map(v => `▶️ [${escapeMd(v.title)}](${v.url})\n   _by ${escapeMd(v.channel)}_`)
//             .join('\n');
//         sections.push(`🎬 *New YouTube Videos \\(${videos.length}\\)*\n${videoLines}`);
//     }

//     // ── Emails ───────────────────────────────────────────────────────────────
//     if (emails.length > 0) {
//         const emailLines = emails
//             .map(e =>
//                 `📧 *${escapeMd(e.subject)}*\n   _From: ${escapeMd(e.from)}_\n   ${escapeMd(truncate(e.snippet, 80))}`
//             )
//             .join('\n');
//         sections.push(`📬 *New Emails \\(${emails.length}\\)*\n${emailLines}`);
//     }

//     sections.push(`_Stay focused and have a productive day\\! 💪_`);

//     return sections.join('\n\n─────────────────────\n\n');
// }

// // Escape special chars for Telegram MarkdownV2
// function escapeMd(text: string): string {
//     return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
// }

// function truncate(str: string, maxLen: number): string {
//     return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
// }

// // ─── Route handler ─────────────────────────────────────────────────────────────

// // Called by Vercel Cron at UTC 00:30 (IST 06:00)
// // GET /api/telegram/remind
// export async function GET(req: Request) {
//     try {
//         // Auth check
//         const authHeader = req.headers.get('authorization');
//         const cronSecret = process.env.CRON_SECRET;
//         if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
//             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//         }

//         const token = process.env.TELEGRAM_BOT_TOKEN;
//         const chatId = process.env.TELEGRAM_CHAT_ID;
//         if (!token || !chatId) {
//             return NextResponse.json(
//                 { error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured.' },
//                 { status: 500 }
//             );
//         }

//         // ── Fetch all data in parallel ──────────────────────────────────────
//         await dbConnect();

//         const today = new Date();
//         const start = new Date(today); start.setHours(0, 0, 0, 0);
//         const end = new Date(today); end.setHours(23, 59, 59, 999);

//         const [tasksDueToday, videos, emails] = await Promise.all([
//             Task.find({
//                 completed: false,
//                 $or: [
//                     { dueDate: { $gte: start, $lte: end } },
//                     { dueDate: null },
//                 ],
//             })
//                 .sort({ dueDate: 1, createdAt: 1 })
//                 .limit(20),

//             fetchNewYouTubeVideos(25),
//             fetchNewGmailMessages(25),
//         ]);

//         // ── Build & send single message ─────────────────────────────────────
//         const dateStr = today.toLocaleDateString('en-IN', {
//             weekday: 'long',
//             year: 'numeric',
//             month: 'long',
//             day: 'numeric',
//             timeZone: 'Asia/Kolkata',
//         });

//         const message = buildMorningMessage({
//             dateStr,
//             tasks: tasksDueToday,
//             videos,
//             emails,
//         });

//         await sendTelegramMessage(token, chatId, message);

//         return NextResponse.json({
//             success: true,
//             tasks: tasksDueToday.length,
//             videos: videos.length,
//             emails: emails.length,
//         });
//     } catch (error) {
//         console.error('Telegram remind error:', error);
//         return NextResponse.json({ success: false }, { status: 500 });
//     }
// }