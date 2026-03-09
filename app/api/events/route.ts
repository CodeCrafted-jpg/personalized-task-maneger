import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Event } from '@/lib/models/Task';

// GET /api/events — returns all events where targetDate >= today, sorted soonest first
export async function GET() {
    try {
        await dbConnect();

        const events = await Event.find({ targetDate: { $gte: new Date() } })
            .select('title targetDate')
            .sort({ targetDate: 1 })
            .limit(20);

        return NextResponse.json({ events });
    } catch (error) {
        console.error('Events list error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}