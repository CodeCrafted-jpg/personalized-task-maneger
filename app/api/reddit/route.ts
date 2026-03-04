import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const sub = searchParams.get('sub') || 'webdev';
        const sort = searchParams.get('sort') || 'top';

        const validSorts = ['top', 'new', 'hot', 'rising'];
        const safeSort = validSorts.includes(sort) ? sort : 'top';

        const response = await fetch(
            `https://www.reddit.com/r/${encodeURIComponent(sub)}/${safeSort}.json?limit=8`,
            {
                headers: {
                    'User-Agent': 'task-manager-app:v1.0.0 (personal use)',
                },
                next: { revalidate: 60 }, // cache 60s on Vercel
            }
        );

        if (!response.ok) {
            throw new Error(`Reddit returned ${response.status}`);
        }

        const data = await response.json();

        const posts = data.data.children.map((child: any) => ({
            id: child.data.id,
            title: child.data.title,
            url: child.data.permalink,
            subreddit: child.data.subreddit_name_prefixed,
            ups: child.data.ups,
        }));

        return NextResponse.json({ success: true, data: posts });
    } catch (error) {
        console.error('Reddit API Error:', error);
        return NextResponse.json({ success: false, data: [] }, { status: 500 });
    }
}
