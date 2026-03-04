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
} from 'lucide-react';

interface Task {
    _id: string;
    text: string;
    completed: boolean;
    createdAt: string;
    dueDate?: string;
}

export default function TaskManager() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [input, setInput] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [voiceStatus, setVoiceStatus] = useState('');
    const recognitionRef = useRef<any>(null);

    // ── Fetch all tasks ──────────────────────────────────────────────────────────
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

    // ── Add Task ─────────────────────────────────────────────────────────────────
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

    // ── Toggle Complete ──────────────────────────────────────────────────────────
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

    // ── Delete Task ──────────────────────────────────────────────────────────────
    const deleteTask = async (id: string) => {
        const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            setTasks((prev) => prev.filter((t) => t._id !== id));
        }
    };

    // ── Inline Edit ──────────────────────────────────────────────────────────────
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

    // ── Voice ────────────────────────────────────────────────────────────────────
    const startListening = () => {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setVoiceStatus('Speech recognition not supported in this browser.');
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true);
            setVoiceStatus('Listening…');
        };

        recognition.onresult = async (event: any) => {
            const spoken = event.results[0][0].transcript;
            setTranscript(spoken);
            setVoiceStatus(`Heard: "${spoken}" — Processing…`);
            setIsListening(false);

            // Send to Cohere for intent parsing
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
                } else if (json.action === 'DELETE' && json.task) {
                    const match = tasks.find((t) =>
                        t.text.toLowerCase().includes(json.task.toLowerCase())
                    );
                    if (match) {
                        await deleteTask(match._id);
                        setVoiceStatus(`🗑️ Deleted: "${match.text}"`);
                    } else {
                        setVoiceStatus(`⚠️ Couldn't find task: "${json.task}"`);
                    }
                } else if (json.action === 'COMPLETE' && json.task) {
                    const match = tasks.find((t) =>
                        t.text.toLowerCase().includes(json.task.toLowerCase())
                    );
                    if (match) {
                        await toggleTask(match._id, match.completed);
                        setVoiceStatus(`✅ Completed: "${match.text}"`);
                    }
                } else {
                    setVoiceStatus(`🤔 Couldn't understand: "${spoken}". Try "Add...", "Delete...", or "Complete..."`);
                }
            } catch (e) {
                setVoiceStatus('Error processing voice command.');
            }
        };

        recognition.onerror = () => {
            setIsListening(false);
            setVoiceStatus('Microphone error. Check permissions.');
        };

        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const stopListening = () => {
        recognitionRef.current?.stop();
        setIsListening(false);
    };

    const completedCount = tasks.filter((t) => t.completed).length;

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white">Tasks</h2>
                    <p className="text-sm text-neutral-400 mt-0.5">
                        {completedCount} / {tasks.length} completed
                    </p>
                </div>
                {/* Progress bar */}
                <div className="w-24 h-2 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                        className="h-full bg-linear-to-r from-teal-500 to-teal-400 transition-all duration-500"
                        style={{ width: tasks.length ? `${(completedCount / tasks.length) * 100}%` : '0%' }}
                    />
                </div>
            </div>

            {/* Input area */}
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTask(input, dueDate)}
                        placeholder="Add a task…"
                        className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all"
                    />
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-3 text-sm text-neutral-400 focus:outline-none focus:border-teal-500/50 transition-all cursor-pointer"
                        title="Set due date"
                    />
                    <button
                        onClick={() => addTask(input, dueDate)}
                        disabled={!input.trim() || loading}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-teal-500 text-neutral-950 font-semibold text-sm hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </button>

                    {/* Mic button */}
                    <button
                        onClick={isListening ? stopListening : startListening}
                        title="Voice command"
                        className={`flex items-center justify-center px-4 py-3 rounded-xl border font-medium text-sm transition-all active:scale-95 ${isListening
                                ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse'
                                : 'bg-neutral-900 border-white/10 text-neutral-400 hover:border-teal-500/50 hover:text-teal-400'
                            }`}
                    >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                </div>

                {/* Voice status */}
                {voiceStatus && (
                    <p className="text-xs text-neutral-400 px-1 fade-in-up">{voiceStatus}</p>
                )}
            </div>

            {/* Task list */}
            <div className="flex flex-col gap-2 max-h-100 overflow-y-auto pr-1">
                {tasks.length === 0 && (
                    <div className="text-center py-12 text-neutral-500 text-sm">
                        No tasks yet. Add one above or use your voice!
                    </div>
                )}
                {tasks.map((task) => (
                    <div
                        key={task._id}
                        className={`group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-4 rounded-xl border transition-all duration-200 fade-in-up ${task.completed
                                ? 'bg-neutral-900/40 border-white/5 opacity-60'
                                : 'bg-neutral-900/70 border-white/8 hover:border-teal-500/30'
                            }`}
                    >
                        {/* Checkbox */}
                        <button
                            onClick={() => toggleTask(task._id, task.completed)}
                            className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${task.completed
                                    ? 'bg-teal-500 border-teal-500'
                                    : 'border-neutral-600 hover:border-teal-500'
                                }`}
                        >
                            {task.completed && <Check className="w-3 h-3 text-neutral-950" />}
                        </button>

                        {/* Text or edit input */}
                        <div className="flex-1 min-w-0">
                            {editingId === task._id ? (
                                <input
                                    autoFocus
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit(task._id);
                                        if (e.key === 'Escape') setEditingId(null);
                                    }}
                                    className="w-full bg-transparent text-sm text-white focus:outline-none border-b border-teal-500/50 wrap-break-word"
                                />
                            ) : (
                                <span
                                    className={`block text-sm leading-relaxed wrap-break-word hyphens-auto ${task.completed ? 'line-through text-neutral-500' : 'text-neutral-100'
                                        }`}
                                >
                                    {task.text}
                                </span>
                            )}
                        </div>

                        {/* Due date badge */}
                        {task.dueDate && !editingId && (
                            <span className="flex sm:flex items-center gap-1 text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full w-fit shrink-0">
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span className="break-keep">{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </span>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 ml-auto sm:ml-0">
                            {editingId === task._id ? (
                                <>
                                    <button
                                        onClick={() => saveEdit(task._id)}
                                        className="p-1.5 rounded-lg text-teal-400 hover:bg-teal-500/20 transition-colors"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-700 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => { setEditingId(task._id); setEditText(task.text); }}
                                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => deleteTask(task._id)}
                                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
