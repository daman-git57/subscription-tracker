(function () {
    const $ = id => document.getElementById(id);
    const form = $("authForm");
    const message = $("authMessage");
    let mode = "login";
    function showMessage(text, isError = false) { message.textContent = text; message.className = "auth-message-text" + (isError ? " error" : ""); }
    function setMode(next) {
        mode = next;
        $("authTitle").textContent = mode === "login" ? "Welcome back" : "Create your account";
        $("authSubtitle").textContent = mode === "login" ? "Log in to continue to your SubTrack dashboard." : "Start keeping all your subscriptions in one place.";
        $("nameField").hidden = mode === "login";
        $("authSubmit").textContent = mode === "login" ? "Log in" : "Create account";
        $("switchPrompt").textContent = mode === "login" ? "Don't have an account?" : "Already have an account?";
        $("switchMode").textContent = mode === "login" ? "Sign up" : "Log in";
        showMessage("");
    }
    $("switchMode").addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));
    $("forgotPassword").addEventListener("click", async () => {
        const email = $("email").value.trim();
        if (!email) return showMessage("Enter your email address first.", true);
        if (!SubTrackAuth.configured) return showMessage("Connect Supabase first. See SETUP.md.", true);
        const { error } = await SubTrackAuth.client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname.replace("login.html", "login.html") });
        showMessage(error ? error.message : "Password reset email sent. Check your inbox.", Boolean(error));
    });
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!SubTrackAuth.configured) return showMessage("Supabase is not configured yet. Add your project URL and anon key in javascript/supabase-config.js.", true);
        const email = $("email").value.trim();
        const password = $("password").value;
        const name = $("fullName").value.trim();
        const submit = $("authSubmit"); submit.disabled = true; submit.textContent = "Please wait…";
        try {
            if (mode === "signup") {
                const { data, error } = await SubTrackAuth.client.auth.signUp({ email, password, options: { data: { full_name: name } } });
                if (error) throw error;
                if (data.session) location.replace("index.html");
                else showMessage("Account created! Check your email to confirm your address, then log in.");
            } else {
                const { error } = await SubTrackAuth.client.auth.signInWithPassword({ email, password });
                if (error) throw error;
                location.replace("index.html");
            }
        } catch (error) { showMessage(error.message || "Something went wrong. Please try again.", true); }
        finally { submit.disabled = false; submit.textContent = mode === "login" ? "Log in" : "Create account"; }
    });
    (async () => {
        if (!SubTrackAuth.configured) showMessage("Setup needed: add your Supabase URL and anon key. See SETUP.md.", true);
        else if (await SubTrackAuth.getSession()) location.replace("index.html");
    })();
})();
