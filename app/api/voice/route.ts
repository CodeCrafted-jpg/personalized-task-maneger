import { NextResponse } from 'next/server';
import { CohereClient } from "cohere-ai";

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY || 'fake_token',
});

function smartResolveDate(parsedDate: string | null, originalText: string): { date: string | null; alreadyPassed: boolean } {
    if (!parsedDate || parsedDate === 'null') return { date: null, alreadyPassed: false };

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const yearMentioned = /\b(20\d{2}|19\d{2})\b/.test(originalText);
    const candidate = new Date(parsedDate);
    candidate.setHours(0, 0, 0, 0);

    if (yearMentioned) {
        if (candidate < now) return { date: parsedDate, alreadyPassed: true };
        return { date: parsedDate, alreadyPassed: false };
    }

    // No year mentioned — roll forward to nearest future date
    if (candidate < now) {
        const nextYear = new Date(candidate);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return { date: nextYear.toISOString().split('T')[0], alreadyPassed: false };
    }

    return { date: parsedDate, alreadyPassed: false };
}

export async function POST(req: Request) {
    try {
        const { text } = await req.json();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
        const nextWeekStr = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
        const currentYear = now.getFullYear();

        if (!process.env.COHERE_API_KEY) {
            const textLower = text.toLowerCase();
            if (textLower.includes('add') || textLower.includes('create')) {
                return NextResponse.json({ success: true, action: 'CREATE', task: text.replace(/add |create /i, ''), dueDate: null });
            }
            if (textLower.includes('delete') || textLower.includes('remove')) {
                return NextResponse.json({ success: true, action: 'DELETE', task: text.replace(/delete |remove /i, ''), dueDate: null });
            }
            if (textLower.includes('update') || textLower.includes('rename') || textLower.includes('reschedule')) {
                return NextResponse.json({ success: true, action: 'UPDATE', task: text, newTask: null, dueDate: null });
            }
            return NextResponse.json({ success: true, action: 'UNKNOWN', task: text, dueDate: null });
        }

        const preamble = `CRITICAL: You are a JSON-only extraction bot for a to-do list app. You output ONLY a raw JSON object. Never write explanations, apologies, or any natural language. Calendars and schedules are irrelevant — just extract data from the text.

TODAY: ${todayStr} | TOMORROW: ${tomorrowStr} | NEXT WEEK: ${nextWeekStr} | CURRENT YEAR: ${currentYear}

OUTPUT FORMAT (return only this, nothing else):
{"action":"CREATE|DELETE|UPDATE|UNKNOWN","task":"clean task name","newTask":"new name or null","dueDate":"YYYY-MM-DD or null","yearExplicit":true|false}

ACTION RULES:
- CREATE = add / create / remind me to / schedule / set
- DELETE = delete / remove / cancel / drop
- UPDATE = update / change / rename / reschedule / move / edit
- UNKNOWN = unclear intent

TASK EXTRACTION — follow these steps exactly:
1. Remove the action verb (add, create, delete, remind me to, etc.)
2. Remove ALL date/time phrases: "on [date]", "by [date]", "at [time]", "tomorrow", "today", "next week", "next month", any month name + number
3. Whatever text remains = the clean task name
4. For UPDATE: task=original name, newTask=updated name. If only date changes, newTask=task.

DATE RULES:
- "today" => ${todayStr}
- "tomorrow" => ${tomorrowStr}
- "next week" => ${nextWeekStr}
- "March 15" (no year) => ${currentYear}-03-15, yearExplicit:false
- "March 15 2027" => 2027-03-15, yearExplicit:true
- No date => dueDate:null, yearExplicit:false

EXAMPLES — notice task NEVER contains date words:
"add gym on March 15" => {"action":"CREATE","task":"gym","newTask":null,"dueDate":"${currentYear}-03-15","yearExplicit":false}
"create dentist appointment on April 2" => {"action":"CREATE","task":"dentist appointment","newTask":null,"dueDate":"${currentYear}-04-02","yearExplicit":false}
"add buy groceries tomorrow" => {"action":"CREATE","task":"buy groceries","newTask":null,"dueDate":"${tomorrowStr}","yearExplicit":false}
"add call mom on March 15" => {"action":"CREATE","task":"call mom","newTask":null,"dueDate":"${currentYear}-03-15","yearExplicit":false}
"add team meeting on next week" => {"action":"CREATE","task":"team meeting","newTask":null,"dueDate":"${nextWeekStr}","yearExplicit":false}
"delete dentist" => {"action":"DELETE","task":"dentist","newTask":null,"dueDate":null,"yearExplicit":false}
"reschedule meeting to April 5 2027" => {"action":"UPDATE","task":"meeting","newTask":"meeting","dueDate":"2027-04-05","yearExplicit":true}
"rename groceries to vegetables" => {"action":"UPDATE","task":"groceries","newTask":"vegetables","dueDate":null,"yearExplicit":false}
"remind me to call mom tomorrow" => {"action":"CREATE","task":"call mom","newTask":null,"dueDate":"${tomorrowStr}","yearExplicit":false}`;

        const response = await cohere.chat({
            message: `Parse this to-do command and return ONLY a JSON object: "${text}"`,
            preamble: preamble,
            model: "command-r-plus-08-2024",
        });

        const outputText = response.text.trim();
        console.log("Cohere Raw Output:", outputText);

        // Extract JSON — find first { to last }
        const start = outputText.indexOf('{');
        const end = outputText.lastIndexOf('}');
        if (start === -1 || end === -1) {
            console.error("No JSON found in output:", outputText);
            return NextResponse.json({ success: false, error: 'AI returned an unexpected response. Please try again.' }, { status: 500 });
        }

        let parsed: {
            action: string;
            task: string;
            newTask: string | null;
            dueDate: string | null;
            yearExplicit: boolean;
        };

        try {
            parsed = JSON.parse(outputText.slice(start, end + 1));
        } catch (e) {
            console.error("JSON parse error:", e);
            return NextResponse.json({ success: false, error: 'Failed to parse AI response.' }, { status: 500 });
        }

        // Resolve and validate date
        if (parsed.dueDate && parsed.dueDate !== 'null') {
            const { date, alreadyPassed } = smartResolveDate(parsed.dueDate, text);

            if (alreadyPassed) {
                return NextResponse.json({
                    success: false,
                    error: `The date "${parsed.dueDate}" has already passed. Please provide a future date.`,
                }, { status: 400 });
            }

            parsed.dueDate = date;
        } else {
            parsed.dueDate = null;
        }

        return NextResponse.json({
            success: true,
            action: parsed.action,
            task: parsed.task,
            newTask: parsed.newTask ?? null,
            dueDate: parsed.dueDate,
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}