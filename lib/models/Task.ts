import mongoose from 'mongoose';

// ─── Task ──────────────────────────────────────────────────────────────────────

const TaskSchema = new mongoose.Schema({
    text: {
        type:      String,
        required:  [true, 'Please provide a task description.'],
        maxlength: [200, 'Task cannot be more than 200 characters'],
    },
    completed: {
        type:    Boolean,
        default: false,
    },
    dueDate: {
        type:    Date,
        default: null,
    },
    // null = standalone task, ObjectId = belongs to an AI-planned event
    eventId: {
        type:    mongoose.Schema.Types.ObjectId,
        ref:     'Event',
        default: null,
    },
    createdAt: {
        type:    Date,
        default: Date.now,
    },
});

TaskSchema.index({ eventId: 1, dueDate: 1 });

// ─── Event ─────────────────────────────────────────────────────────────────────

const EventSchema = new mongoose.Schema(
    {
        title: {
            type:     String,
            required: [true, 'Please provide an event title.'],
            trim:     true,
        },
        description: {
            type:     String,
            required: [true, 'Please provide an event description.'],
            trim:     true,
        },
        targetDate: {
            type:     Date,
            required: [true, 'Please provide a target date.'],
        },
    },
    { timestamps: true }
);

// ─── Exports ───────────────────────────────────────────────────────────────────

export const Task  = mongoose.models.Task  || mongoose.model('Task',  TaskSchema);
export const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);

// Default export keeps backward-compat for any file doing: import Task from '@/lib/models/Task'
export default Task;