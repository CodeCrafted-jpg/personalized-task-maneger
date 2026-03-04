'use client';

import { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Send, MessageSquare, CheckCircle, AlertCircle, Loader2, Trash2, Plus, Check, Bot, User, Sparkles } from 'lucide-react';

interface Task {
    _id: string;
    text: string;
    completed: boolean;
    createdAt: string;
    dueDate?: string;
}

interface Message {
    id: string;
    type: 'user' | 'assistant';
    text: string;
    action?: string;
    timestamp: Date;
}

export default function ChatAssistant() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            type: 'assistant',
            text: '👋 Hi! I\'m your task assistant. You can ask me to add, delete, or complete tasks. Try saying "add buy groceries on March 20" or "complete homework".',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch tasks
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

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Process task command
    const processTaskCommand = async (command: string) => {
        setLoading(true);

        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            text: command,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);

        try {
            // Send to voice API for intent parsing
            const res = await fetch('/api/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: command }),
            });
            const json = await res.json();

            // Handle past-date error from voice API
            if (!json.success && json.error) {
                setMessages((prev) => [...prev, {
                    id: (Date.now() + 1).toString(),
                    type: 'assistant',
                    text: `⚠️ ${json.error}`,
                    timestamp: new Date(),
                }]);
                setLoading(false);
                setInput('');
                return;
            }

            let response = '';
            let actionType = '';

            if (json.action === 'CREATE' && json.task) {
                // ✅ FIX: include dueDate when posting to /api/tasks
                const addRes = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: json.task.trim(),
                        dueDate: json.dueDate ?? null,   // <-- was missing before
                    }),
                });
                const addJson = await addRes.json();
                if (addJson.success) {
                    setTasks((prev) => [addJson.data, ...prev]);
                    const duePart = json.dueDate
                        ? ` 📅 Due: ${new Date(json.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : '';
                    response = `✅ Added: "${json.task}"${duePart}`;
                    actionType = 'CREATE';
                } else {
                    response = `❌ Failed to add task.`;
                }

            } else if (json.action === 'DELETE' && json.task) {
                const match = tasks.find((t) =>
                    t.text.toLowerCase().includes(json.task.toLowerCase())
                );
                if (match) {
                    const delRes = await fetch(`/api/tasks/${match._id}`, { method: 'DELETE' });
                    const delJson = await delRes.json();
                    if (delJson.success) {
                        setTasks((prev) => prev.filter((t) => t._id !== match._id));
                        response = `🗑️ Deleted: "${match.text}"`;
                        actionType = 'DELETE';
                    }
                } else {
                    response = `⚠️ Couldn't find task: "${json.task}"`;
                }

            } else if (json.action === 'UPDATE' && json.task) {
                const match = tasks.find((t) =>
                    t.text.toLowerCase().includes(json.task.toLowerCase())
                );
                if (match) {
                    const updateBody: any = {};
                    if (json.newTask && json.newTask !== json.task) updateBody.text = json.newTask;
                    if (json.dueDate !== undefined) updateBody.dueDate = json.dueDate ?? null;

                    const updateRes = await fetch(`/api/tasks/${match._id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateBody),
                    });
                    const updateJson = await updateRes.json();
                    if (updateJson.success) {
                        setTasks((prev) => prev.map((t) => (t._id === match._id ? updateJson.data : t)));
                        const duePart = json.dueDate
                            ? ` 📅 Due: ${new Date(json.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : '';
                        response = `✏️ Updated: "${match.text}"${duePart}`;
                        actionType = 'UPDATE';
                    }
                } else {
                    response = `⚠️ Couldn't find task: "${json.task}"`;
                }

            } else if (json.action === 'COMPLETE' && json.task) {
                const match = tasks.find((t) =>
                    t.text.toLowerCase().includes(json.task.toLowerCase())
                );
                if (match) {
                    const updateRes = await fetch(`/api/tasks/${match._id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ completed: !match.completed }),
                    });
                    const updateJson = await updateRes.json();
                    if (updateJson.success) {
                        setTasks((prev) => prev.map((t) => (t._id === match._id ? updateJson.data : t)));
                        response = `✅ Completed: "${match.text}"`;
                        actionType = 'COMPLETE';
                    }
                } else {
                    response = `⚠️ Couldn't find task: "${json.task}"`;
                }

            } else {
                response = `🤔 I didn't understand. Try "add [task] on [date]", "delete [task]", "update [task]", or "complete [task]"`;
            }

            setMessages((prev) => [...prev, {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                text: response,
                action: actionType,
                timestamp: new Date(),
            }]);
        } catch (e) {
            setMessages((prev) => [...prev, {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                text: '❌ Error processing command. Please try again.',
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
            setInput('');
        }
    };

    // Voice recognition
    const startListening = () => {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setMessages((prev) => [...prev, {
                id: Date.now().toString(),
                type: 'assistant',
                text: '❌ Speech recognition not supported in your browser. Try Chrome, Edge, or Safari.',
                timestamp: new Date(),
            }]);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognitionRef.current = recognition;

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = async (event: any) => {
            const spoken = event.results[0][0].transcript;
            setIsListening(false);
            await processTaskCommand(spoken);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const stopListening = () => {
        recognitionRef.current?.stop();
        setIsListening(false);
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;
        await processTaskCommand(input.trim());
    };

    return (
        <div className="flex flex-col h-[600px] bg-white">
            {/* Chat header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Virtual Assistant</h2>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Online</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-6 bg-slate-50/30">
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={`flex gap-3 max-w-[85%] ${m.type === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${m.type === 'user' ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                            {m.type === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                        </div>
                        <div className={`flex flex-col gap-1 ${m.type === 'user' ? 'items-end' : ''}`}>
                            <div className={`px-5 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${m.type === 'user'
                                ? 'bg-primary text-black rounded-tr-none'
                                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                }`}>
                                <p>{m.text}</p>
                                {m.action && (
                                    <div className={`mt-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${m.type === 'user' ? 'text-white/70' : 'text-primary'}`}>
                                        {m.action === 'CREATE' && <Plus className="w-3 h-3" />}
                                        {m.action === 'DELETE' && <Trash2 className="w-3 h-3" />}
                                        {m.action === 'COMPLETE' && <Check className="w-3 h-3" />}
                                        {m.action === 'UPDATE' && <MessageSquare className="w-3 h-3" />}
                                        {m.action.toLowerCase()}d
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 px-1">
                                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-3 max-w-[85%]">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white text-slate-400 border border-slate-200 shadow-sm">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div className="px-5 py-3 rounded-2xl bg-white text-slate-400 border border-slate-100 rounded-tl-none flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Task Quick View */}
            {tasks.length > 0 && (
                <div className="px-6 py-4 bg-white border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Today's Progress</p>
                    <div className="flex flex-wrap gap-2">
                        {tasks.filter(t => !t.completed).slice(0, 3).map(t => (
                            <div key={t._id} className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-bold text-slate-600">
                                {t.text}{t.dueDate ? ` · ${new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                            </div>
                        ))}
                        {tasks.filter(t => !t.completed).length > 3 && (
                            <div className="px-3 py-1 bg-primary/5 text-primary text-[11px] font-bold rounded-full">
                                +{tasks.filter(t => !t.completed).length - 3} more
                            </div>
                        )}
                        {tasks.filter(t => !t.completed).length === 0 && (
                            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold rounded-full flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> All done!
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-slate-100">
                <div className="relative flex items-center gap-3 bg-slate-100 p-2 rounded-2xl">
                    <button
                        onClick={isListening ? stopListening : startListening}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-slate-400 hover:text-primary shadow-sm'}`}
                        title="Voice Input"
                    >
                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Try 'add dentist on March 20'..."
                        className="flex-1 bg-transparent px-2 py-3 text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || loading}
                        className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}