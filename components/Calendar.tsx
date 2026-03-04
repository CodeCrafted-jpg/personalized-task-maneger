'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Check, Circle, Sparkles, Clock } from 'lucide-react';

interface Task {
    _id: string;
    text: string;
    completed: boolean;
    dueDate?: string;
}

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay(); // 0=Sun
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export default function Calendar() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
    const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch all tasks with due dates for the month
    const fetchAllDueTasks = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/calendar');
            const json = await res.json();
            if (json.success) setAllTasks(json.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllDueTasks();
    }, []);

    // Update selected tasks when day/month/year changes
    useEffect(() => {
        if (selectedDay === null) {
            setSelectedTasks([]);
            return;
        }
        const selected = new Date(year, month, selectedDay);
        const tasks = allTasks.filter((t) => {
            if (!t.dueDate) return false;
            const d = new Date(t.dueDate);
            return (
                d.getFullYear() === selected.getFullYear() &&
                d.getMonth() === selected.getMonth() &&
                d.getDate() === selected.getDate()
            );
        });
        setSelectedTasks(tasks);
    }, [selectedDay, allTasks, month, year]);

    // Find which days in current month have tasks
    const daysWithTasks = new Set(
        allTasks
            .filter((t) => {
                if (!t.dueDate) return false;
                const d = new Date(t.dueDate);
                return d.getFullYear() === year && d.getMonth() === month;
            })
            .map((t) => new Date(t.dueDate!).getDate())
    );

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
        setSelectedDay(null);
    };

    const nextMonth = () => {
        if (month === 11) { setMonth(0); setYear(y => y + 1); }
        else setMonth(m => m + 1);
        setSelectedDay(null);
    };

    const isToday = (day: number) =>
        day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header Area */}
            <div className="px-6 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                        <CalIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Calendar</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{MONTHS[month]} {year}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="w-10 h-10 rounded-xl border border-slate-100 bg-white text-slate-400 hover:text-primary transition-all flex items-center justify-center">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={nextMonth} className="w-10 h-10 rounded-xl border border-slate-100 bg-white text-slate-400 hover:text-primary transition-all flex items-center justify-center">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                {/* Calendar Grid */}
                <div className="flex-1 p-4 sm:p-6 border-r border-slate-100 overflow-auto">
                    {/* Days header */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
                        {DAYS.map(day => (
                            <div key={day} className="text-center text-[9px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-widest py-1 sm:py-2">
                                {day.substring(0, 1)}
                            </div>
                        ))}
                    </div>
                    
                    {/* Calendar days grid */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="w-full" style={{ aspectRatio: '1' }} />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                            const hasTasks = daysWithTasks.has(day);
                            const isSelected = selectedDay === day;
                            const todayFlag = isToday(day);

                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    style={{ aspectRatio: '1' }}
                                    className={`relative w-full flex flex-col items-center justify-center rounded-lg sm:rounded-2xl text-xs sm:text-sm font-bold transition-all group overflow-hidden ${isSelected
                                            ? 'bg-primary text-black shadow-lg shadow-primary/20'
                                            : todayFlag
                                                ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                        }`}
                                >
                                    <span>{day}</span>
                                    {hasTasks && !isSelected && (
                                        <div className="absolute top-1 right-1 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-purple-400 group-hover:scale-125 transition-transform" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

           
            </div>
                 {/* Selected Day View */}
                <div className="w-full lg:w-80 bg-slate-50/50 p-4 sm:p-6 overflow-y-auto flex flex-col">
                    <div className="flex items-center justify-between mb-4 sm:mb-6 shrink-0">
                        <div>
                            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Schedule</h3>
                            {selectedDay !== null && (
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedDay} {MONTHS[month]}</p>
                            )}
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 shrink-0">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:gap-3 overflow-y-auto">
                        {selectedDay === null ? (
                            <div className="py-8 sm:py-10 text-center">
                                <p className="text-xs sm:text-sm font-bold text-slate-400">Select a day to view tasks</p>
                            </div>
                        ) : selectedTasks.length === 0 ? (
                            <div className="py-8 sm:py-10 text-center flex flex-col items-center gap-2 sm:gap-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center text-slate-200">
                                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-slate-400">No tasks planned</p>
                            </div>
                        ) : (
                            selectedTasks.map((task) => (
                                <div
                                    key={task._id}
                                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${task.completed
                                            ? 'bg-slate-100 border-slate-200 opacity-60'
                                            : 'bg-white border-slate-100 shadow-sm'
                                        }`}
                                >
                                    <div className="flex gap-2 sm:gap-3">
                                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'
                                            }`}>
                                            {task.completed && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <p className={`text-xs sm:text-sm font-semibold leading-relaxed wrap-break-word ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                            {task.text}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
        </div>
    );
}
