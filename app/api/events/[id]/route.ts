import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Task, Event } from '@/lib/models/Task';
import mongoose from 'mongoose';

// ─── GET /api/events/[id] ──────────────────────────────────────────────────────

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json({ error: 'Invalid event ID.' }, { status: 400 });
        }

        await dbConnect();

        const [event, tasks] = await Promise.all([
            Event.findById(id),
            Task.find({ eventId: id }).sort({ dueDate: 1 }),
        ]);

        if (!event) {
            return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
        }

        return NextResponse.json({ event, tasks });
    } catch (error) {
        console.error('Event fetch error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// ─── DELETE /api/events/[id] ───────────────────────────────────────────────────
// Deletes the event AND all its associated tasks so they never appear in reminders.

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json({ error: 'Invalid event ID.' }, { status: 400 });
        }

        await dbConnect();

        const event = await Event.findById(id);
        if (!event) {
            return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
        }

        // Delete tasks first, then the event
        const { deletedCount } = await Task.deleteMany({ eventId: id });
        await Event.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            tasksDeleted: deletedCount,
        });
    } catch (error) {
        console.error('Event delete error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}