'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateEventPage() {
    const router = useRouter();

    const [title, setTitle]             = useState('');
    const [description, setDescription] = useState('');
    const [targetDate, setTargetDate]   = useState('');
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState('');

    // Min date = tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    async function handleSubmit() {
        setError('');
        if (!title.trim() || !description.trim() || !targetDate) {
            setError('Please fill in all fields.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/events/create', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ title, description, targetDate }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? 'Something went wrong.');
                return;
            }

            router.push(`/events/${data.eventId}`);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-white text-[#0e0e11] font-mono px-4 py-12 flex flex-col items-center">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap');

                * { box-sizing: border-box; }

                body { background: #0e0e11; }

                .page-title {
                    font-family: 'Syne', sans-serif;
                    font-weight: 800;
                    font-size: clamp(2rem, 5vw, 3.2rem);
                    letter-spacing: -0.03em;
                    background: linear-gradient(135deg, #e8ff47 0%, #47ffd4 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .sub {
                    font-family: 'Space Mono', monospace;
                    font-size: 0.78rem;
                    color: #555;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    margin-top: 6px;
                }

                .card {
                    background: #15151a;
                    border: 1px solid #222;
                    border-radius: 16px;
                    padding: 36px 32px;
                    width: 100%;
                    max-width: 560px;
                    margin-top: 40px;
                    box-shadow: 0 0 60px rgba(232,255,71,0.04);
                }

                label {
                    display: block;
                    font-family: 'Space Mono', monospace;
                    font-size: 0.7rem;
                    color: #666;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                    margin-top: 24px;
                }

                label:first-child { margin-top: 0; }

                input, textarea {
                    width: 100%;
                    background: #0e0e11;
                    border: 1px solid #2a2a30;
                    border-radius: 10px;
                    padding: 12px 14px;
                    color: #eee;
                    font-family: 'Space Mono', monospace;
                    font-size: 0.88rem;
                    outline: none;
                    transition: border-color 0.2s;
                    resize: none;
                }

                input:focus, textarea:focus {
                    border-color: #e8ff47;
                }

                input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: invert(0.5);
                    cursor: pointer;
                }

                .btn {
                    margin-top: 32px;
                    width: 100%;
                    padding: 14px;
                    border-radius: 10px;
                    border: none;
                    background: #e8ff47;
                    color: #0e0e11;
                    font-family: 'Syne', sans-serif;
                    font-weight: 700;
                    font-size: 1rem;
                    letter-spacing: 0.04em;
                    cursor: pointer;
                    transition: opacity 0.2s, transform 0.1s;
                }

                .btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
                .btn:active:not(:disabled) { transform: translateY(0); }
                .btn:disabled { opacity: 0.4; cursor: not-allowed; }

                .error-box {
                    margin-top: 16px;
                    background: rgba(255, 80, 80, 0.08);
                    border: 1px solid rgba(255, 80, 80, 0.25);
                    border-radius: 8px;
                    padding: 10px 14px;
                    font-size: 0.8rem;
                    color: #ff6b6b;
                    font-family: 'Space Mono', monospace;
                }

                .spinner {
                    display: inline-block;
                    width: 14px;
                    height: 14px;
                    border: 2px solid #0e0e11;
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                    vertical-align: middle;
                    margin-right: 8px;
                }

                @keyframes spin { to { transform: rotate(360deg); } }

                .hint {
                    font-size: 0.72rem;
                    color: #3a3a45;
                    margin-top: 6px;
                    font-family: 'Space Mono', monospace;
                }
            `}</style>

            <div style={{ textAlign: 'center' }}>
                <div className="page-title">Plan an Event</div>
                <div className="sub">AI generates your day-by-day roadmap</div>
            </div>

            <div className="card">
                <label>Event Title</label>
                <input
                    type="text"
                    placeholder="e.g. Hackathon, Product Launch, Exam"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={80}
                />

                <label>What are you building / preparing for?</label>
                <textarea
                    rows={4}
                    placeholder="Describe your goal in detail. The more context, the better the plan."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                />
                <div className="hint">Be specific — mention tech stack, deliverables, constraints etc.</div>

                <label>Target Date</label>
                <input
                    type="date"
                    min={minDate}
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                />
                <div className="hint">AI will create one task per day leading up to this date.</div>

                {error && <div className="error-box">⚠ {error}</div>}

                <button className="btn" onClick={handleSubmit} disabled={loading}>
                    {loading
                        ? <><span className="spinner" />Generating Plan…</>
                        : '✦ Generate Plan'}
                </button>
            </div>
        </main>
    );
}