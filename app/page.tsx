import Link from 'next/link';
import { CheckSquare, MessageSquare, Flame, ArrowRight, Zap, Mic, Calendar, Send, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Control Center — Personal Task Manager',
  description: 'A smart personal dashboard with task management, voice assistant, Reddit feed, and more.',
};

export default function Home() {
  const features = [
    {
      icon: CheckSquare,
      title: 'Task Management',
      description: 'Organize tasks with upcoming and completed tabs. Add due dates and track progress.',
      href: '/tasks',
      color: 'teal',
    },
    {
      icon: MessageSquare,
      title: 'Voice Assistant',
      description: 'Manage tasks using voice or text. Say "add homework" or "complete project".',
      href: '/assistant',
      color: 'purple',
    },
    {
      icon: Flame,
      title: 'Reddit Feed',
      description: 'Browse trending posts from your favorite subreddits in one place.',
      href: '/reddit',
      color: 'orange',
    },
  ];

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Soft ambient background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal/5 rounded-full blur-[120px]" />

      <main className="container-center relative z-10 py-20">
        {/* Hero Section - Centered */}
        <div className="flex flex-col items-center text-center gap-8 mb-24 max-w-3xl mx-auto fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Intelligence at your service
          </div>
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Elevate Your <span className="text-primary italic">Productivity</span>
          </h1>
          <p className="text-slate-500 text-xl md:text-2xl leading-relaxed">
            Experience the future of task management with a voice-powered hub that helps you focus on what truly matters.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            <Link
              href="/tasks"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-bold text-lg hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95"
            >
              Launch Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/assistant"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-50 transition-all active:scale-95"
            >
              Try Voice Assistant
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-24">
          <div className="flex flex-col mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Power Features</h2>
            <div className="w-16 h-1.5 bg-primary rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              const colorStyles = {
                teal: 'bg-teal-bg text-teal border-teal/20',
                purple: 'bg-purple-bg text-purple border-purple/20',
                orange: 'bg-orange-bg text-orange border-orange/20',
              };
              const styles = colorStyles[feature.color as keyof typeof colorStyles];

              return (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className={`soft-card p-8 flex flex-col gap-6 hover:-translate-y-2 group transition-all`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${styles}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
                    <p className="text-slate-500 leading-relaxed">{feature.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-primary font-bold mt-auto group-hover:gap-4 transition-all">
                    Get Started <ArrowRight className="w-5 h-5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>



        {/* Footer */}
        <footer className="py-12 border-t border-slate-200 text-center">
          <p className="text-slate-400 font-medium">
            &copy; {new Date().getFullYear()} Control Center — Designed for Clarity
          </p>
        </footer>
      </main>
    </div>
  );
}


