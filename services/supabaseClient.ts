
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Access Environment Variables injected by Vite
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let client: SupabaseClient | any;

// CRITICAL FIX: Prevent app crash if keys are missing (e.g. in preview without .env)
if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
    client = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn("Supabase credentials missing. App running in offline/demo mode.");
    // Mock client to prevent runtime errors accessing .from() etc.
    client = {
        from: () => ({
            select: () => Promise.resolve({ data: [], error: null }),
            insert: () => Promise.resolve({ data: null, error: null }),
            upsert: () => Promise.resolve({ data: null, error: null }),
            order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
            gte: () => Promise.resolve({ data: [], error: null })
        }),
        auth: {
            getSession: () => Promise.resolve({ data: { session: null } }),
            signInWithPassword: () => Promise.resolve({ error: { message: "Supabase not configured" } }),
            signOut: () => Promise.resolve()
        },
        channel: () => ({
            on: () => ({ subscribe: () => {} }),
            subscribe: () => {},
            track: () => Promise.resolve(),
            presenceState: () => ({})
        }),
        removeChannel: () => {}
    };
}

export const supabase = client;

export const trackUserActivity = async (eventType: string, details?: string) => {
    // @ts-ignore
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!user) return;

    try {
        await supabase.from('activity_logs').insert({
            telegram_id: user.id,
            event_type: eventType,
            details: details
        });
    } catch (e) {
        // Silent fail in production/demo
        console.error("Log error", e);
    }
};

export const upsertUser = async () => {
    // @ts-ignore
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!user) return;

    try {
        await supabase.from('users').upsert({
            telegram_id: user.id,
            first_name: user.first_name,
            username: user.username,
            last_active: new Date().toISOString()
        });
    } catch (e) {
        console.error("Upsert error", e);
    }
};
