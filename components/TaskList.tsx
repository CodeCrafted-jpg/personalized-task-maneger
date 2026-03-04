'use client';

import { useEffect, useState, useRef } from 'react';
import {
    Plus,
    Mic,
    MicOff,
    Check,
    Trash2,
    Pencil,
    X,
    Loader2,
    Calendar,
    Search,
    Clock,
    CheckCircle2,
    CalendarDays
} from 'lucide-react';

interface Task {
    _id: string;
    text: string;
    completed: boolean;
    createdAt: string;
    dueDate?: string;
}

export default function TaskList() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [input, setInput] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('');
    const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
    const [searchQuery, setSearchQuery] = useState('');
    const recognitionRef = useRef<any>(null);

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/tasks');
            const json = await res.json();
            if (json.success) setTasks(json.data);
        } catch (e) {
            console.error('Fetch tasks error:', e);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const addTask = async (text: string, due?: string) => {
        if (!text.trim()) return;
        setLoading(true);
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.trim(), ...(due && { dueDate: due }) }),
            });
            const json = await res.json();
            if (json.success) {
                setTasks((prev) => [json.data, ...prev]);
                setInput('');
                setDueDate('');
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleTask = async (id: string, completed: boolean) => {
        const res = await fetch(`/api/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: !completed }),
        });
        const json = await res.json();
        if (json.success) {
            setTasks((prev) => prev.map((t) => (t._id === id ? json.data : t)));
        }
    };

    const deleteTask = async (id: string) => {
        const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            setTasks((prev) => prev.filter((t) => t._id !== id));
        }
    };

    const saveEdit = async (id: string) => {
        if (!editText.trim()) return;
        const res = await fetch(`/api/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: editText.trim() }),
        });
        const json = await res.json();
        if (json.success) {
            setTasks((prev) => prev.map((t) => (t._id === id ? json.data : t)));
            setEditingId(null);
        }
    };

    const startListening = () => {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setVoiceStatus('Speech recognition not supported.');
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true);
            setVoiceStatus('Listening...');
        };

        recognition.onresult = async (event: any) => {
            const spoken = event.results[0][0].transcript;
            setVoiceStatus(`Heard: "${spoken}"`);
            setIsListening(false);

            try {
                const res = await fetch('/api/voice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: spoken }),
                });
                const json = await res.json();
                if (json.action === 'CREATE' && json.task) {
                    await addTask(json.task);
                    setVoiceStatus(`✅ Added: "${json.task}"`);
                } else {
                    setVoiceStatus(`🤔 Try: "Add [task]"`);
                }
            } catch (e) {
                setVoiceStatus('Voice processing error.');
            }
        };

        recognition.onerror = () => {
            setIsListening(false);
            setVoiceStatus('Microphone error.');
        };

        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const stopListening = () => {
        recognitionRef.current?.stop();
        setIsListening(false);
    };

    const filteredTasks = tasks.filter(t =>
        t.text.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const upcomingTasks = filteredTasks.filter((t) => !t.completed);
    const completedTasks = filteredTasks.filter((t) => t.completed);
    const currentTasks = activeTab === 'upcoming' ? upcomingTasks : completedTasks;

    const renderTaskItem = (task: Task, index: number) => {
        // Assign colors based on index for variety
        const colorPresets = [
            { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', accent: 'bg-rose-500' },
            { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', accent: 'bg-indigo-500' },
            { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', accent: 'bg-amber-500' },
            { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', accent: 'bg-emerald-500' },
        ];
        const color = colorPresets[index % colorPresets.length];

        return (
            <div
                key={task._id}
                className="relative pl-10 fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
            >
                {/* Timeline connector */}
                <div className="absolute left-[1.125rem] top-0 bottom-0 w-0.5 bg-slate-100 last:h-8" />

                {/* Timeline node */}
                <div className={`absolute left-0 top-6 w-9 h-9 rounded-full border-4 border-white ${task.completed ? 'bg-emerald-500' : color.accent} shadow-sm z-10 flex items-center justify-center text-white`}>
                    {task.completed ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>

                <div className={`soft-card p-5 mb-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 ${task.completed ? 'opacity-70 bg-slate-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                        {editingId === task._id ? (
                            <input
                                autoFocus
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveEdit(task._id)}
                                onBlur={() => setEditingId(null)}
                                className="w-full bg-transparent text-base sm:text-lg font-bold text-slate-900 border-b-2 border-primary focus:outline-none break-words"
                            />
                        ) : (
                            <div className="flex flex-col gap-2">
                                <h3 className={`text-base sm:text-lg font-bold leading-normal break-words hyphens-auto ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                    {task.text}
                                </h3>
                                {task.dueDate && (
                                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 w-fit">
                                        <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {!task.completed && (
                            <button
                                onClick={() => toggleTask(task._id, task.completed)}
                                className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                                title="Mark Complete"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={() => { setEditingId(task._id); setEditText(task.text); }}
                            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => deleteTask(task._id)}
                            className="w-10 h-10 rounded-xl bg-rose-50 text-rose-400 flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">My Tasks</h1>
                    <p className="text-slate-500 font-medium">
                        You have <span className="text-primary font-bold">{upcomingTasks.length} tasks</span> for today.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Input Section */}
            <div className="soft-card p-2 bg-slate-100 border-slate-200">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTask(input, dueDate)}
                        placeholder="What needs to be done?"
                        className="flex-1 bg-white px-6 py-4 rounded-xl font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none shadow-sm"
                    />
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="hidden md:block bg-white px-4 py-4 rounded-xl font-bold text-slate-500 focus:outline-none shadow-sm cursor-pointer"
                        title="Due Date"
                    />
                    <button
                        onClick={isListening ? stopListening : startListening}
                        className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-slate-400 hover:text-primary shadow-sm'}`}
                    >
                        {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>
                    <button
                        onClick={() => addTask(input, dueDate)}
                        disabled={!input.trim() || loading}
                        className="bg-primary text-black w-14 h-14 rounded-xl flex items-center justify-center hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                    </button>
                </div>
                {voiceStatus && (
                    <div className="px-6 py-2 text-xs font-bold text-primary uppercase tracking-wider animate-pulse">
                        {voiceStatus}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-slate-200">
                {(['upcoming', 'completed'] as const).map((tab) => {
                    const isActive = activeTab === tab;
                    const count = tab === 'upcoming' ? upcomingTasks.length : completedTasks.length;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 px-2 text-lg font-extrabold capitalize transition-all relative ${isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab}
                            <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-primary/10' : 'bg-slate-100'}`}>
                                {count}
                            </span>
                            {isActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                        </button>
                    );
                })}
            </div>

            {/* Task Timeline */}
         <div className="flex flex-col">
    {currentTasks.length === 0 ? (
        activeTab === 'upcoming' ? (
            // ── Upcoming: All caught up ───────────────────────────
            <div className="py-20 flex flex-col items-center text-center">
                {/* Icon: simple circle with a checkmark, no fill */}
                <div className="w-14 h-14 rounded-full border-2 border-slate-200 flex items-center justify-center mb-6">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                        <polyline points="4 10 8.5 14.5 16 7" />
                    </svg>
                </div>
                <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-[0.12em] mb-2">
                    All clear
                </p>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    No upcoming tasks
                </h3>
                <p className="text-sm text-slate-400 max-w-[200px] leading-relaxed">
                    You're all caught up. Add a task to get started.
                </p>
            </div>
        ) : (
            // ── Completed: Nothing here yet ───────────────────────
            <div className="py-20 flex flex-col items-center text-center">
                {/* Icon: three horizontal lines suggesting an empty list */}
                <div className="w-14 h-14 rounded-full border-2 border-slate-200 flex flex-col items-center justify-center gap-1.5 mb-6">
                    <span className="w-5 h-px bg-slate-300 block" />
                    <span className="w-3.5 h-px bg-slate-200 block" />
                    <span className="w-4 h-px bg-slate-200 block" />
                </div>
                <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-[0.12em] mb-2">
                    Nothing yet
                </p>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    No completed tasks
                </h3>
                <p className="text-sm text-slate-400 max-w-[200px] leading-relaxed">
                    Finished tasks will appear here once you complete them.
                </p>
            </div>
        )
    ) : (
        currentTasks.map((task, idx) => renderTaskItem(task, idx))
    )}
</div>
        </div>
    );
}

