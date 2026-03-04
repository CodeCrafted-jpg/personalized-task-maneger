'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckSquare, MessageSquare, Flame, Home, Layout } from 'lucide-react';

export default function Navigation() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Home', icon: Home },
        { href: '/tasks', label: 'Tasks', icon: CheckSquare },
        { href: '/assistant', label: 'Assistant', icon: MessageSquare },
        { href: '/reddit', label: 'Reddit', icon: Flame },
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="container-center py-4">
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                            <Layout className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Control Center
                        </h1>
                    </Link>

                    <div className="flex items-center gap-1 sm:gap-4">
                        {navItems.map(({ href, label, icon: Icon }) => {
                            const isActive = pathname === href;
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isActive
                                            ? 'bg-primary text-blue-500 shadow-md shadow-primary/20 scale-105'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden md:inline">{label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </nav>
    );
}

