import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
    text: {
        type: String,
        required: [true, 'Please provide a task description.'],
        maxlength: [200, 'Task cannot be more than 200 characters'],
    },
    completed: {
        type: Boolean,
        default: false,
    },
    dueDate: {
        type: Date,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
