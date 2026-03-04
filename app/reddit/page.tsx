import RedditFeed from '@/components/RedditFeed';

export const metadata = {
    title: 'Reddit Feed - Control Center',
    description: 'Browse trending posts from your favorite subreddits',
};

export default function RedditPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <main className="container-center py-12 md:py-20">
                <div className="max-w-4xl mx-auto flex flex-col gap-8">
                    <div className="text-center md:text-left">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Reddit Feed</h1>
                        <p className="text-slate-500 text-lg mt-2 font-medium">Discover trending posts from your favorite communities</p>
                    </div>
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-2 overflow-hidden">
                        <RedditFeed />
                    </div>
                </div>
            </main>
        </div>
    );
}

