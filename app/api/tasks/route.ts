import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task from '@/lib/models/Task';

export async function GET() {
    await dbConnect();
    try {
        const tasks = await Task.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: tasks });
    } catch (error) {
        return NextResponse.json({ success: false }, { status: 400 });
    }
}

export async function POST(req: Request) {
    await dbConnect();
    try {
        const body = await req.json();
        const task = await Task.create(body);
        return NextResponse.json({ success: true, data: task }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false }, { status: 400 });
    }
}
