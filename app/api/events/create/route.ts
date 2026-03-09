import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Task, Event } from '@/lib/models/Task';

// ─── Cohere planner ────────────────────────────────────────────────────────────

interface DayTask {
    day: number;
    task: string;
}

async function generatePlanWithCohere(
    title: string,
    description: string,
    targetDate: Date
): Promise<DayTask[]> {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) throw new Error('COHERE_API_KEY is not configured.');

    const today    = new Date();
    const daysLeft = Math.max(
        1,
        Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );
    const deadlineStr = targetDate.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    const prompt = `You are a productivity planner. Break the following goal into realistic daily preparation steps.

Goal Title: "${title}"
Goal Description: "${description}"
Deadline: ${deadlineStr} (${daysLeft} days from today)

Rules:
- Create exactly ${daysLeft} daily tasks, one per day
- Each task must be short and actionable (under 10 words)
- Tasks must build progressively toward the goal
- Output ONLY valid JSON — no markdown, no explanation

Output format:
[
  { "day": 1, "task": "..." },
  { "day": 2, "task": "..." }
]`;

    const res = await fetch('https://api.cohere.com/v2/chat', {
        method:  'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model:    'command-r-plus-08-2024',
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Cohere API error: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    const raw  = data?.message?.content?.[0]?.text ?? '';

    const cleaned = raw.replace(/```json|```/gi, '').trim();
    const parsed: DayTask[] = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) throw new Error('Cohere returned invalid plan format.');
    return parsed;
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, description, targetDate } = body as {
            title?: string;
            description?: string;
            targetDate?: string;
        };

        if (!title?.trim() || !description?.trim() || !targetDate) {
            return NextResponse.json(
                { error: 'title, description, and targetDate are required.' },
                { status: 400 }
            );
        }

        const parsedDate = new Date(targetDate);
        if (isNaN(parsedDate.getTime())) {
            return NextResponse.json({ error: 'Invalid targetDate.' }, { status: 400 });
        }

        await dbConnect();

        // 1. Save event
        const event = await Event.create({
            title:       title.trim(),
            description: description.trim(),
            targetDate:  parsedDate,
        });

        // 2. Generate AI plan
        const plan = await generatePlanWithCohere(title, description, parsedDate);

        // 3. Convert day offsets → real due dates and insert tasks
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const taskDocs = plan.map((item) => {
            const dueDate = new Date(today);
            dueDate.setDate(today.getDate() + item.day - 1);
            dueDate.setHours(23, 59, 59, 999);

            return {
                text:      item.task,
                dueDate,
                completed: false,
                eventId:   event._id,
            };
        });

        await Task.insertMany(taskDocs);

        return NextResponse.json({
            success: true,
            eventId: event._id,
            tasksCreated: taskDocs.length,
        });
    } catch (error) {
        console.error('Event create error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error.' },
            { status: 500 }
        );
    }
}