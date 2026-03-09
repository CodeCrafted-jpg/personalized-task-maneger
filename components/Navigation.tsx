'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckSquare, MessageSquare, Flame, Home, Layout, Calendar, Plus, ChevronDown, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface EventItem {
    _id: string;
    title: string;
    targetDate: string;
}

export default function Navigation() {
    const pathname = usePathname();

    const [dropdownOpen, setDropdownOpen]   = useState(false);
    const [events, setEvents]               = useState<EventItem[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const dropdownRef                       = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Fetch ongoing events when dropdown opens
    async function handleEventsClick() {
        const next = !dropdownOpen;
        setDropdownOpen(next);
        if (!next || events.length > 0) return;

        setLoadingEvents(true);
        try {
            const res  = await fetch('/api/events');
            const data = await res.json();
            setEvents(data.events ?? []);
        } catch {
            setEvents([]);
        } finally {
            setLoadingEvents(false);
        }
    }

    function daysLeft(iso: string) {
        const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (diff <= 0) return 'today';
        if (diff === 1) return '1 day left';
        return `${diff} days left`;
    }

    const isEventsActive = pathname.startsWith('/events');

    const navItems = [
        { href: '/',          label: 'Home',      icon: Home },
        { href: '/tasks',     label: 'Tasks',     icon: CheckSquare },
        { href: '/assistant', label: 'Assistant', icon: MessageSquare },
        { href: '/reddit',    label: 'Reddit',    icon: Flame },
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="container-center py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                            <Layout className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Control Center
                        </h1>
                    </Link>

                    {/* Nav items */}
                    <div className="flex items-center gap-1 sm:gap-4">
                        {navItems.map(({ href, label, icon: Icon }) => {
                            const isActive = pathname === href;
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                        isActive
                                            ? 'bg-primary text-blue-500 shadow-md shadow-primary/20 scale-105'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden md:inline">{label}</span>
                                </Link>
                            );
                        })}

                        {/* Events dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={handleEventsClick}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                    isEventsActive || dropdownOpen
                                        ? 'bg-primary text-blue-500 shadow-md shadow-primary/20 scale-105'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <Calendar className="w-4 h-4" />
                                <span className="hidden md:inline">Events</span>
                                <ChevronDown
                                    className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">

                                    {/* New Event */}
                                    <Link
                                        href="/events/create"
                                        onClick={() => setDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-black bg-primary hover:opacity-90 transition-opacity"
                                    >
                                        <Plus className="w-4 h-4" />
                                        New Event
                                    </Link>

                                    <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        Ongoing
                                    </div>

                                    {/* Ongoing events list */}
                                    {loadingEvents ? (
                                        <div className="flex items-center justify-center gap-2 py-6 text-slate-400 text-sm">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading…
                                        </div>
                                    ) : events.length === 0 ? (
                                        <p className="px-4 py-5 text-sm text-slate-400 text-center">
                                            No ongoing events
                                        </p>
                                    ) : (
                                        <ul className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                                            {events.map(ev => (
                                                <li key={ev._id}>
                                                    <Link
                                                        href={`/events/${ev._id}`}
                                                        onClick={() => setDropdownOpen(false)}
                                                        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors group"
                                                    >
                                                        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate pr-2">
                                                            {ev.title}
                                                        </span>
                                                        <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                                                            {daysLeft(ev.targetDate)}
                                                        </span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}