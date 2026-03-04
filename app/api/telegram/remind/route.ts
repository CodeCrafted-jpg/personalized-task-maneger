import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task from '@/lib/models/Task';

// This is called by Vercel Cron at UTC 00:30 (IST 06:00)
// GET /api/telegram/remind
export async function GET(req: Request) {
    try {
        // Simple bearer check using a secret to prevent unauthorized calls
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!token || !chatId) {
            return NextResponse.json(
                { error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured.' },
                { status: 500 }
            );
        }

        await dbConnect();

        // Get today's tasks (tasks due today + all incomplete tasks)
        const today = new Date();
        const start = new Date(today);
        start.setHours(0, 0, 0, 0);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);

        const tasksDueToday = await Task.find({
            completed: false,
            $or: [
                { dueDate: { $gte: start, $lte: end } },
                { dueDate: null },
            ],
        })
            .sort({ dueDate: 1, createdAt: 1 })
            .limit(20);

        if (tasksDueToday.length === 0) {
            const emptyMsg = `🌅 *Good morning!*\n\nNo tasks due today. Enjoy your day! 🎉`;
            await sendTelegramMessage(token, chatId, emptyMsg);
            return NextResponse.json({ success: true, sent: 0 });
        }

        const dateStr = today.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Kolkata',
        });

        const taskLines = tasksDueToday
            .map((t, i) => {
                const due = t.dueDate
                    ? ` _(due today)_`
                    : ` _(pending)_`;
                return `${i + 1}. ${t.text}${due}`;
            })
            .join('\n');

        const message = `🌅 *Good morning! Daily Task Reminder*\n📅 ${dateStr}\n\n*${tasksDueToday.length} task(s) to tackle today:*\n\n${taskLines}\n\n_Stay focused and have a productive day! 💪_`;

        await sendTelegramMessage(token, chatId, message);

        return NextResponse.json({ success: true, sent: tasksDueToday.length });
    } catch (error) {
        console.error('Telegram remind error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Telegram API error: ${JSON.stringify(err)}`);
    }
    return res.json();
}
