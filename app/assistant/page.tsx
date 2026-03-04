import ChatAssistant from '@/components/ChatAssistant';

export const metadata = {
    title: 'Assistant - Control Center',
    description: 'Voice and text-based task management assistant',
};

export default function AssistantPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <main className="container-center py-12 md:py-20">
                <div className="max-w-4xl mx-auto flex flex-col gap-8">
                    <div className="text-center md:text-left">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Task Assistant</h1>
                        <p className="text-slate-500 text-lg mt-2 font-medium">Manage tasks using voice or text commands</p>
                    </div>
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-1 overflow-hidden">
                        <ChatAssistant />
                    </div>
                </div>
            </main>
        </div>
    );
}

