import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task from '@/lib/models/Task';
import { fetchWeather, WeatherReport } from '@/lib/integrations/dailyDigest';
import { fetchAndSummarizeGmailMessages, GmailSummary } from '@/lib/integrations/emailSummarizer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface YoutubeVideo {
    title: string;
    url: string;
    channel: string;
    publishedAt: Date;
}

// ─── YouTube RSS helpers ───────────────────────────────────────────────────────

const YOUTUBE_CHANNELS: { handle: string; channelId: string }[] = [
    { handle: 'JavaScript Mastery', channelId: 'UCmXmlB4-HJytD7wek0Uo97A' },
    { handle: "It's Jack",          channelId: 'UCVRBCvTBT8MxObAogMqkArQ' },
];

async function fetchNewYouTubeVideos(sinceHours = 25): Promise<YoutubeVideo[]> {
    const cutoff = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
    const videos: YoutubeVideo[] = [];

    for (const ch of YOUTUBE_CHANNELS) {
        try {
            const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`;
            const res = await fetch(rssUrl, { next: { revalidate: 0 } });
            if (!res.ok) continue;

            const xml     = await res.text();
            const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];

            for (const entry of entries) {
                const title   = entry.match(/<title>(.*?)<\/title>/)?.[1] ?? 'Untitled';
                const link    = entry.match(/<link rel="alternate"[^>]+href="([^"]+)"/)?.[1] ?? '';
                const pubStr  = entry.match(/<published>(.*?)<\/published>/)?.[1] ?? '';
                const pubDate = pubStr ? new Date(pubStr) : new Date(0);

                if (pubDate >= cutoff) {
                    videos.push({
                        title: decodeXmlEntities(title),
                        url: link,
                        channel: ch.handle,
                        publishedAt: pubDate,
                    });
                }
            }
        } catch (err) {
            console.error(`YouTube RSS fetch failed for ${ch.handle}:`, err);
        }
    }

    return videos;
}

function decodeXmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

// ─── Telegram helper ───────────────────────────────────────────────────────────

async function sendTelegramMessage(token: string, chatId: string, text: string) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2' }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Telegram API error: ${JSON.stringify(err)}`);
    }
    return res.json();
}

// ─── Message builder ───────────────────────────────────────────────────────────

function buildMorningMessage(params: {
    dateStr: string;
    tasks:   { text: string; dueDate: Date | null }[];
    videos:  YoutubeVideo[];
    emails:  GmailSummary[];
    weather: WeatherReport | null;
}): string {
    const { dateStr, tasks, videos, emails, weather } = params;
    const sections: string[] = [];

    sections.push(`🌅 *Good morning\\! Daily Digest*\n📅 ${escapeMd(dateStr)}`);

    // ── Weather ───────────────────────────────────────────────────────────────
    if (weather) {
        const w = weather;
        sections.push(
            `${w.icon} *Weather — ${escapeMd(w.city)}*\n` +
            `${escapeMd(capitalize(w.description))} • ${w.tempC}°C \\(feels ${w.feelsLikeC}°C\\)\n` +
            `💧 Humidity: ${w.humidity}%  💨 Wind: ${w.windKph} km\\/h`
        );
    }

    // ── Tasks ─────────────────────────────────────────────────────────────────
    if (tasks.length === 0) {
        sections.push(`✅ *Tasks*\nNo tasks due today\\. Enjoy your day\\! 🎉`);
    } else {
        const taskLines = tasks
            .map((t, i) => {
                const label = t.dueDate ? `_\\(due today\\)_` : `_\\(pending\\)_`;
                return `${i + 1}\\. ${escapeMd(t.text)} ${label}`;
            })
            .join('\n');
        sections.push(`📋 *Tasks \\(${tasks.length}\\)*\n${taskLines}`);
    }

    // ── YouTube ───────────────────────────────────────────────────────────────
    if (videos.length > 0) {
        const videoLines = videos
            .map(v => `▶️ [${escapeMd(v.title)}](${v.url})\n   _by ${escapeMd(v.channel)}_`)
            .join('\n');
        sections.push(`🎬 *New YouTube Videos \\(${videos.length}\\)*\n${videoLines}`);
    }

    // ── Emails ────────────────────────────────────────────────────────────────
    if (emails.length > 0) {
        const emailLines = emails
            .slice(0, 8)
            .map(e =>
                `📧 *${escapeMd(truncate(e.subject, 45))}*\n` +
                `   _From:_ ${escapeMd(truncate(e.from, 40))}\n` +
                `   ${escapeMd(truncate(e.summary, 120))}`
            )
            .join('\n');
        sections.push(`📬 *Recent Emails \\(${emails.length}\\)*\n${emailLines}`);
    }

    sections.push(`_Stay focused and have a productive day\\! 💪_`);

    return sections.join('\n\n─────────────────────\n\n');
}

function escapeMd(text: string): string {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

function truncate(str: string, maxLen: number): string {
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Route handler ─────────────────────────────────────────────────────────────

// Called by Vercel Cron at UTC 00:30 (IST 06:00)
// GET /api/telegram/remind
export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token  = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!token || !chatId) {
            return NextResponse.json(
                { error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured.' },
                { status: 500 }
            );
        }

        await dbConnect();

        const today = new Date();
        const start = new Date(today); start.setHours(0, 0, 0, 0);
        const end   = new Date(today); end.setHours(23, 59, 59, 999);

        const [tasksDueToday, videos, emails, weather] = await Promise.all([
            Task.find({
                completed: false,
                $or: [
                    { dueDate: { $gte: start, $lte: end } },
                    { dueDate: null },
                ],
            })
                .sort({ dueDate: 1, createdAt: 1 })
                .limit(20),

            fetchNewYouTubeVideos(25),
            fetchAndSummarizeGmailMessages({ sinceHours: 25, maxMessages: 8 }),
            fetchWeather(),
        ]);

        const dateStr = today.toLocaleDateString('en-IN', {
            weekday:  'long',
            year:     'numeric',
            month:    'long',
            day:      'numeric',
            timeZone: 'Asia/Kolkata',
        });

        const message = buildMorningMessage({ dateStr, tasks: tasksDueToday, videos, emails, weather });

        await sendTelegramMessage(token, chatId, message);

        return NextResponse.json({
            success: true,
            tasks:   tasksDueToday.length,
            videos:  videos.length,
            emails:  emails.length,
            weather: weather?.city ?? null,
        });
    } catch (error) {
        console.error('Telegram remind error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}