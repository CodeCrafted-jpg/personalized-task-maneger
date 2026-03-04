'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ExternalLink, RefreshCw, Flame, Hash, TrendingUp, Search } from 'lucide-react';

interface RedditPost {
    id: string;
    title: string;
    url: string;
    subreddit: string;
    ups: number;
}

const PRESET_SUBS = ['webdev', 'programming', 'javascript', 'nextjs', 'MachineLearning'];

export default function RedditFeed() {
    const [posts, setPosts] = useState<RedditPost[]>([]);
    const [subreddit, setSubreddit] = useState('webdev');
    const [customSub, setCustomSub] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sort, setSort] = useState<'top' | 'new' | 'hot'>('top');

    const fetchPosts = async (sub: string, sortBy: string) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/reddit?sub=${sub}&sort=${sortBy}`);
            const json = await res.json();
            if (json.success) {
                setPosts(json.data);
            } else {
                setError('Could not fetch posts. Reddit may be rate-limiting.');
                setPosts([]);
            }
        } catch {
            setError('Network error fetching Reddit posts.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts(subreddit, sort);
    }, [subreddit, sort]);

    const handleCustomSub = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && customSub.trim()) {
            setSubreddit(customSub.trim().replace(/^r\//, ''));
            setCustomSub('');
        }
    };

    return (
        <div className="flex flex-col h-150 bg-white">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                        <Flame className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Reddit Feed</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">r/{subreddit}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => fetchPosts(subreddit, sort)}
                    disabled={loading}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Subreddit Nav & Controls */}
            <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {PRESET_SUBS.map((sub) => (
                        <button
                            key={sub}
                            onClick={() => setSubreddit(sub)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subreddit === sub
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            r/{sub}
                        </button>
                    ))}
                    <div className="relative ml-2 min-w-37.5">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={customSub}
                            onChange={(e) => setCustomSub(e.target.value)}
                            onKeyDown={handleCustomSub}
                            placeholder="r/other..."
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    {(['hot', 'top', 'new'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setSort(s)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${sort === s
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-400 hover:text-slate-600 bg-slate-50'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-slate-50/30">
                {error && (
                    <div className="py-20 text-center px-6">
                        <p className="text-rose-500 text-sm font-bold mb-2">Error</p>
                        <p className="text-slate-500 text-sm font-medium">{error}</p>
                    </div>
                )}
                {loading && !posts.length && (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-primary animate-spin" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fetching trending posts...</p>
                    </div>
                )}
                {!loading && !error && posts.length === 0 && (
                    <div className="py-20 text-center">
                        <p className="text-slate-500 font-bold">No posts found.</p>
                    </div>
                )}
                {posts.map((post, idx) => (
                    <a
                        key={post.id}
                        href={`https://reddit.com${post.url.startsWith('http') ? '' : post.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="soft-card p-4 group hover:border-primary/30 transition-all flex flex-col gap-2"
                        style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                        <h3 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                            {post.title}
                        </h3>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">r/{post.subreddit}</span>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 text-[11px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                                    <ArrowUp className="w-3 h-3" />
                                    {post.ups > 999 ? (post.ups / 1000).toFixed(1) + 'k' : post.ups}
                                </span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}
