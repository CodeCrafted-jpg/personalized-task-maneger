'use client';

import { useState, useEffect } from 'react';
import { Send, Bell, BellOff, CheckCircle, AlertCircle, Loader2, Key, UserCheck, ShieldCheck } from 'lucide-react';

export default function TelegramConfig() {
    const [token, setToken] = useState('');
    const [chatId, setChatId] = useState('');
    const [saved, setSaved] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    // Load from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('tg_token') || '';
        const savedChatId = localStorage.getItem('tg_chat_id') || '';
        setToken(savedToken);
        setChatId(savedChatId);
        if (savedToken && savedChatId) setSaved(true);
    }, []);

    const saveConfig = () => {
        if (!token.trim() || !chatId.trim()) return;
        localStorage.setItem('tg_token', token.trim());
        localStorage.setItem('tg_chat_id', chatId.trim());
        setSaved(true);
        setTestStatus('idle');
        setTestMessage('');
    };

    const clearConfig = () => {
        localStorage.removeItem('tg_token');
        localStorage.removeItem('tg_chat_id');
        setToken('');
        setChatId('');
        setSaved(false);
        setTestStatus('idle');
        setTestMessage('');
    };

    const sendTestMessage = async () => {
        if (!token || !chatId) return;
        setTesting(true);
        setTestStatus('idle');
        try {
            const res = await fetch(
                `https://api.telegram.org/bot${token}/sendMessage`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: '✅ *Task Manager connected!*\n\nYou will receive daily reminders at 6:00 AM IST.',
                        parse_mode: 'Markdown',
                    }),
                }
            );
            const json = await res.json();
            if (json.ok) {
                setTestStatus('success');
                setTestMessage('Test message sent! Check your Telegram.');
            } else {
                setTestStatus('error');
                setTestMessage(json.description || 'Failed to send. Check your token/chat ID.');
            }
        } catch {
            setTestStatus('error');
            setTestMessage('Network error sending test message.');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-white">
            {/* Header Area */}
            <div className="px-6 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Send className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Telegram Sync</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reminders at 6:00 AM IST</p>
                    </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${saved ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                    {saved ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                    {saved ? 'Active' : 'Offline'}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-10">
                {/* Visual Intro */}
                <div className="flex flex-col items-center text-center gap-4 py-4">
                    <div className="w-16 h-16 rounded-[2rem] bg-blue-50 flex items-center justify-center text-blue-500">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div className="max-w-xs">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Secure Notifications</h3>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">Connect your Telegram bot to receive encrypted daily task summaries directly to your phone.</p>
                    </div>
                </div>

                {/* Info Box */}
                {!saved && (
                    <div className="soft-card p-6 bg-blue-50 border-blue-100 flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-500 shrink-0 shadow-sm">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-medium text-blue-700 leading-relaxed">
                            <span className="font-bold">Setup:</span> Message <a href="https://t.me/BotFather" target="_blank" className="font-bold underline">@BotFather</a> on Telegram to create a bot. Use <a href="https://t.me/userinfobot" target="_blank" className="font-bold underline">@userinfobot</a> to find your ID.
                        </div>
                    </div>
                )}

                {/* Form Fields */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] px-1">Bot Token</label>
                        <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                                type="password"
                                value={token}
                                onChange={(e) => { setToken(e.target.value); setSaved(false); }}
                                placeholder="123456789:AAF..."
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] px-1">Chat ID</label>
                        <div className="relative">
                            <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                                type="text"
                                value={chatId}
                                onChange={(e) => { setChatId(e.target.value); setSaved(false); }}
                                placeholder="e.g. 987654321"
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-4">
                    <button
                        onClick={saveConfig}
                        disabled={!token.trim() || !chatId.trim()}
                        className="flex-1 py-4 rounded-2xl bg-primary text-white text-sm font-extrabold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all disabled:opacity-50"
                    >
                        Save Configuration
                    </button>
                    {saved && (
                        <button
                            onClick={clearConfig}
                            className="w-14 h-14 rounded-2xl border border-rose-100 bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-all"
                        >
                            <BellOff className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Test Area */}
                <div className="flex flex-col gap-4">
                    <button
                        onClick={sendTestMessage}
                        disabled={!saved || testing}
                        className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-widest hover:border-slate-300 hover:text-slate-600 transition-all flex items-center justify-center gap-2"
                    >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send Test Message
                    </button>

                    {testStatus !== 'idle' && (
                        <div className={`p-4 rounded-2xl border animate-fade-in flex items-center gap-3 ${testStatus === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                            {testStatus === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                            <p className="text-xs font-bold leading-tight">{testMessage}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
