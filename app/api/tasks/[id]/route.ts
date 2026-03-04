import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task from '@/lib/models/Task';

// PATCH to toggle completion
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const id = (await params).id;

    try {
        const { completed, text } = await req.json();
        const task = await Task.findByIdAndUpdate(
            id,
            { ...(completed !== undefined && { completed }), ...(text && { text }) },
            { new: true, runValidators: true }
        );
        if (!task) {
            return NextResponse.json({ success: false }, { status: 400 });
        }
        return NextResponse.json({ success: true, data: task });
    } catch (error) {
        return NextResponse.json({ success: false }, { status: 400 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const id = (await params).id;

    try {
        const deletedTask = await Task.deleteOne({ _id: id });
        if (!deletedTask) {
            return NextResponse.json({ success: false }, { status: 400 });
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false }, { status: 400 });
    }
}
