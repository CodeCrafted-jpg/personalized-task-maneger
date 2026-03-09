'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Task {
    _id: string;
    text: string;
    dueDate: string | null;
    completed: boolean;
}

interface Event {
    _id: string;
    title: string;
    description: string;
    targetDate: string;
    createdAt: string;
}

export default function EventRoadmapPage() {
    const router = useRouter();
    const params = useParams();
    const id     = params?.id as string;

    const [event, setEvent]       = useState<Event | null>(null);
    const [tasks, setTasks]       = useState<Task[]>([]);
    const [loading, setLoading]   = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [error, setError]       = useState('');

    useEffect(() => {
        if (!id) return;
        fetch(`/api/events/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) { setError(data.error); return; }
                setEvent(data.event);
                setTasks(data.tasks);
            })
            .catch(() => setError('Failed to load event.'))
            .finally(() => setLoading(false));
    }, [id]);

    async function handleDelete() {
        if (!confirm('Delete this event and all its tasks? This cannot be undone.')) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? 'Delete failed.'); return; }
            router.push('/');
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setDeleting(false);
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    function formatDate(iso: string) {
        return new Date(iso).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
        });
    }

    function isToday(iso: string | null) {
        if (!iso) return false;
        const d = new Date(iso);
        const t = new Date();
        return d.getDate() === t.getDate() &&
               d.getMonth()  === t.getMonth() &&
               d.getFullYear() === t.getFullYear();
    }

    function isPast(iso: string | null) {
        if (!iso) return false;
        return new Date(iso) < new Date();
    }

    const completedCount = tasks.filter(t => t.completed).length;
    const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

    // ── render ────────────────────────────────────────────────────────────────

    return (
        <main className="min-h-screen bg-black text-[#fafafc] px-4 py-12 flex flex-col items-center">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap');

                * { box-sizing: border-box; }

                .page-title {
                    font-family: 'Syne', sans-serif;
                    font-weight: 800;
                    font-size: clamp(1.8rem, 5vw, 2.8rem);
                    letter-spacing: -0.03em;
                    line-height: 1.1;
                }

                .meta {
                    font-family: 'Space Mono', monospace;
                    font-size: 0.72rem;
                    color: #555;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    margin-top: 6px;
                }

                .wrap { width: 100%; max-width: 600px; margin-top: 36px; }

                /* Progress bar */
                .progress-wrap {
                    background: #1a1a20;
                    border: 1px solid #222;
                    border-radius: 12px;
                    padding: 18px 20px;
                    margin-bottom: 32px;
                }

                .progress-label {
                    display: flex;
                    justify-content: space-between;
                    font-family: 'Space Mono', monospace;
                    font-size: 0.72rem;
                    color: #666;
                    margin-bottom: 10px;
                }

                .progress-track {
                    height: 6px;
                    background: #222;
                    border-radius: 99px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #e8ff47, #47ffd4);
                    border-radius: 99px;
                    transition: width 0.5s ease;
                }

                /* Timeline */
                .timeline { position: relative; padding-left: 28px; }

                .timeline::before {
                    content: '';
                    position: absolute;
                    left: 7px;
                    top: 8px;
                    bottom: 8px;
                    width: 1px;
                    background: linear-gradient(to bottom, #e8ff47, #47ffd4, #222);
                }

                .task-row {
                    position: relative;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                }

                .dot {
                    position: absolute;
                    left: -25px;
                    top: 5px;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    border: 2px solid #333;
                    background: #0e0e11;
                    flex-shrink: 0;
                    transition: background 0.2s;
                }

                .dot.today  { background: #e8ff47; border-color: #e8ff47; box-shadow: 0 0 8px #e8ff4780; }
                .dot.done   { background: #47ffd4; border-color: #47ffd4; }
                .dot.past   { background: #2a2a30; border-color: #2a2a30; }

                .task-card {
                    flex: 1;
                    background: #14141a;
                    border: 1px solid #1e1e26;
                    border-radius: 10px;
                    padding: 12px 14px;
                    transition: border-color 0.2s;
                }

                .task-card.today-card { border-color: #e8ff4740; background: #16161c; }
                .task-card.done-card  { opacity: 0.5; }

                .task-day {
                    font-family: 'Space Mono', monospace;
                    font-size: 0.65rem;
                    color: #444;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                }

                .task-day.today-day { color: #e8ff47; }

                .task-text {
                    font-family: 'Syne', sans-serif;
                    font-size: 0.95rem;
                    color: #ccc;
                    line-height: 1.4;
                }

                .task-text.done-text { text-decoration: line-through; color: #444; }

                /* Delete button */
                .delete-btn {
                    margin-top: 40px;
                    width: 100%;
                    padding: 13px;
                    border-radius: 10px;
                    border: 1px solid #ff6b6b30;
                    background: transparent;
                    color: #ff6b6b;
                    font-family: 'Space Mono', monospace;
                    font-size: 0.8rem;
                    cursor: pointer;
                    letter-spacing: 0.08em;
                    transition: background 0.2s, border-color 0.2s;
                }

                .delete-btn:hover:not(:disabled) {
                    background: rgba(255,107,107,0.08);
                    border-color: #ff6b6b60;
                }

                .delete-btn:disabled { opacity: 0.4; cursor: not-allowed; }

                .error-box {
                    background: rgba(255,80,80,0.08);
                    border: 1px solid rgba(255,80,80,0.25);
                    border-radius: 8px;
                    padding: 10px 14px;
                    font-size: 0.78rem;
                    color: #ff6b6b;
                    font-family: 'Space Mono', monospace;
                    margin-bottom: 20px;
                }

                .spinner {
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    border: 2px solid currentColor;
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                    vertical-align: middle;
                    margin-right: 6px;
                }

                @keyframes spin { to { transform: rotate(360deg); } }

                .target-badge {
                    display: inline-block;
                    background: rgba(232,255,71,0.08);
                    border: 1px solid rgba(232,255,71,0.2);
                    border-radius: 6px;
                    padding: 3px 10px;
                    font-family: 'Space Mono', monospace;
                    font-size: 0.7rem;
                    color: #e8ff47;
                    margin-top: 8px;
                }
            `}</style>

            {loading && (
                <p style={{ fontFamily: 'Space Mono', color: '#444', marginTop: '80px' }}>
                    Loading…
                </p>
            )}

            {!loading && error && (
                <div className="error-box" style={{ marginTop: 60, maxWidth: 500 }}>⚠ {error}</div>
            )}

            {!loading && event && (
                <>
                    <div style={{ textAlign: 'center', maxWidth: 600 }}>
                        <div className="page-title">{event.title}</div>
                        <div className="meta">{event.description}</div>
                        <div className="target-badge">🎯 Target: {formatDate(event.targetDate)}</div>
                    </div>

                    <div className="wrap">
                        {error && <div className="error-box">⚠ {error}</div>}

                        {/* Progress */}
                        <div className="progress-wrap">
                            <div className="progress-label">
                                <span>Progress</span>
                                <span>{completedCount} / {tasks.length} tasks · {progress}%</span>
                            </div>
                            <div className="progress-track">
                                <div className="progress-fill" style={{ width: `${progress}%` }} />
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="timeline">
                            {tasks.map((task, i) => {
                                const today = isToday(task.dueDate);
                                const done  = task.completed;
                                const past  = !done && isPast(task.dueDate);

                                return (
                                    <div className="task-row" key={task._id}>
                                        <div className={`dot ${today ? 'today' : done ? 'done' : past ? 'past' : ''}`} />
                                        <div className={`task-card ${today ? 'today-card' : done ? 'done-card' : ''}`}>
                                            <div className={`task-day ${today ? 'today-day' : ''}`}>
                                                Day {i + 1}
                                                {today && '  ← today'}
                                                {task.dueDate && ` · ${formatDate(task.dueDate)}`}
                                            </div>
                                            <div className={`task-text ${done ? 'done-text' : ''}`}>
                                                {task.text}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Delete */}
                        <button className="delete-btn" onClick={handleDelete} disabled={deleting}>
                            {deleting
                                ? <><span className="spinner" />Deleting…</>
                                : '✕ Delete Event & All Tasks'}
                        </button>
                    </div>
                </>
            )}
        </main>
    );
}