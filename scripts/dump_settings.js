const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function dumpSettings() {
    try {
        const { data, error } = await supabase
            .from('user_notification_settings')
            .select('user_id, category, action, system_enabled');

        if (error) throw error;

        console.log("All Settings Found:");
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

dumpSettings();
