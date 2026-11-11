/* Supabase authentication and session helpers. */
(function () {
    const config = window.SUBTRACK_SUPABASE_CONFIG || {};
    const configured = config.url && config.anonKey &&
        !config.url.includes("YOUR_SUPABASE") && !config.anonKey.includes("YOUR_SUPABASE");
    let client = null;
    if (configured && window.supabase?.createClient) {
        client = window.supabase.createClient(config.url, config.anonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
    }
    const configReady = Boolean(client);
    async function getSession() {
        if (!client) return null;
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        return data.session;
    }
    async function requireSession() {
        if (!client) {
            document.body.innerHTML = '<main class="auth-message"><h1>Connect Supabase first</h1><p>Open <code>javascript/supabase-config.js</code> and add your Supabase Project URL and anon/public key. Follow SETUP.md in this project.</p><a class="button button-primary" href="login.html">Go to login</a></main>';
            return null;
        }
        try {
            const session = await getSession();
            if (!session) { location.replace("login.html"); return null; }
            return session;
        } catch (error) {
            console.error(error); location.replace("login.html"); return null;
        }
    }
    async function signOut() {
        if (client) await client.auth.signOut();
        location.replace("login.html");
    }
    window.SubTrackAuth = { client, configured: configReady, getSession, requireSession, signOut };
})();
