// lib/integrations/emailSummarizer.ts
// Node / Next.js (TypeScript). No external deps required.

type RawGmailHeader = { name: string; value: string };
type GmailRawMessage = any;

export interface GmailSummary {
  id: string;
  subject: string;
  from: string;
  receivedAt: Date;
  summary: string;
  snippet?: string;
}

function b64UrlDecode(input: string): string {
  let s = input.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf-8');
}

function stripHtml(html: string): string {
  return html.replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Cohere summarizer ─────────────────────────────────────────────────────────

async function cohereSummarize(text: string): Promise<string> {
  if (!process.env.COHERE_API_KEY) {
    console.warn('COHERE_API_KEY is not set — returning plain text fallback.');
    return text.slice(0, 200);
  }

  try {
    const prompt = `Summarize the following email in one short sentence (focus on the key purpose or action):\n\n${text}`;

    const res = await fetch('https://api.cohere.ai/v1/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command-r',
        message: prompt,
        temperature: 0.2,
        max_tokens: 60,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.warn('Cohere summarize failed:', res.status, txt);
      return text.slice(0, 200);
    }

    const data = await res.json();
    const maybe = data?.text ?? data?.message ?? data?.generations?.[0]?.text ?? '';
    return (maybe || text.slice(0, 200)).trim();
  } catch (err) {
    console.error('Cohere summarize error', err);
    return text.slice(0, 200);
  }
}

// ── Body extractor ────────────────────────────────────────────────────────────

async function extractPlainTextFromPayload(payload: any): Promise<string> {
  if (!payload) return '';

  // FIX: walk now collects text/plain and text/html separately,
  // always preferring plain text. Previously it returned the first
  // match which could be raw HTML, poisoning the Cohere input.
  const walk = (node: any): { plain: string | null; html: string | null } => {
    if (!node) return { plain: null, html: null };

    if (node.mimeType === 'text/plain' && node.body?.data) {
      return { plain: b64UrlDecode(node.body.data), html: null };
    }

    if (node.mimeType === 'text/html' && node.body?.data) {
      return { plain: null, html: stripHtml(b64UrlDecode(node.body.data)) };
    }

    if (Array.isArray(node.parts)) {
      let bestHtml: string | null = null;
      for (const p of node.parts) {
        const r = walk(p);
        if (r.plain) return { plain: r.plain, html: null }; // plain text wins immediately
        if (r.html && !bestHtml) bestHtml = r.html;
      }
      return { plain: null, html: bestHtml };
    }

    return { plain: null, html: null };
  };

  // Check top-level body first
  if (payload.body?.data) {
    const decoded = b64UrlDecode(payload.body.data);
    return /<[a-z][\s\S]*>/i.test(decoded) ? stripHtml(decoded) : decoded;
  }

  const { plain, html } = walk(payload);
  return plain ?? html ?? '';
}

// ── Gmail OAuth ───────────────────────────────────────────────────────────────

async function getGmailAccessToken(): Promise<string> {
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
    throw new Error('Gmail OAuth env vars are not set.');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to refresh Gmail token: ${res.status} ${txt}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchAndSummarizeGmailMessages({
  sinceHours = 25,
  concurrency = 3,
  maxMessages = 10,
}: {
  sinceHours?: number;
  concurrency?: number;
  maxMessages?: number;
}): Promise<GmailSummary[]> {
  try {
    const accessToken = await getGmailAccessToken();
    const since = Math.floor((Date.now() - sinceHours * 60 * 60 * 1000) / 1000);

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:${since}&maxResults=${maxMessages}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!listRes.ok) {
      console.warn('Gmail list failed', await listRes.text());
      return [];
    }
    const listData = await listRes.json();
    const messageIds: string[] = (listData.messages ?? []).map((m: any) => m.id);

    const results: GmailSummary[] = [];
    for (let i = 0; i < messageIds.length; i += concurrency) {
      const batch = messageIds.slice(i, i + concurrency);
      const promises = batch.map(async (id) => {
        try {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!msgRes.ok) {
            console.warn('Failed fetch message', id, msgRes.status);
            return null;
          }
          const msg: GmailRawMessage = await msgRes.json();
          const headers: RawGmailHeader[] = msg.payload?.headers ?? [];
          const subject = headers.find((h) => h.name === 'Subject')?.value ?? '(no subject)';
          const from = headers.find((h) => h.name === 'From')?.value ?? 'Unknown';
          const dateStr = headers.find((h) => h.name === 'Date')?.value ?? '';
          const receivedAt = dateStr ? new Date(dateStr) : new Date();

          // FIX: bodyText now properly prefers plain text over HTML
          const bodyText = await extractPlainTextFromPayload(msg.payload);
          // FIX: strip HTML from snippet too before passing to Cohere
          const toSummarize = bodyText || stripHtml(msg.snippet ?? '');

          const summary = toSummarize ? await cohereSummarize(toSummarize) : '(no content)';
          return { id, subject, from, receivedAt, summary, snippet: msg.snippet } as GmailSummary;
        } catch (err) {
          console.error('email processing error', err);
          return null;
        }
      });

      const settled = await Promise.all(promises);
      for (const r of settled) if (r) results.push(r);
      await new Promise((res) => setTimeout(res, 120));
    }

    return results;
  } catch (err) {
    console.error('fetchAndSummarizeGmailMessages error', err);
    return [];
  }
}