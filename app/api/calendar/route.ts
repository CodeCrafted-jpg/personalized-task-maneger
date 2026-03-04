import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task from '@/lib/models/Task';

// GET /api/calendar?date=2025-03-04  → tasks due on that date
export async function GET(req: Request) {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    try {
        let query = {};
        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query = { dueDate: { $gte: start, $lte: end } };
        } else {
            // Return all tasks that have a dueDate (for rendering the month)
            query = { dueDate: { $ne: null } };
        }

        const tasks = await Task.find(query).sort({ dueDate: 1 });
        return NextResponse.json({ success: true, data: tasks });
    } catch (error) {
        return NextResponse.json({ success: false }, { status: 400 });
    }
}
