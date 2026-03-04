import TaskList from '@/components/TaskList';
import Calendar from '@/components/Calendar';
import TelegramConfig from '@/components/TelegramConfig';

export const metadata = {
    title: 'Dashboard - Control Center',
    description: 'Manage tasks, view your calendar, and configure notifications.',
};

export default function TasksPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <main className="container-center py-12 md:py-20">
                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Main Task Section */}
                    <div className="flex-1">
                        <TaskList />
                    </div>

                    {/* Sidebar / Secondary Sections */}
                    <div className="w-full lg:w-[400px] flex flex-col gap-10">
                        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                            <Calendar />
                        </section>
                        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                            <TelegramConfig />
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}


