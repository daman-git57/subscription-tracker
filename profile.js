(async function () {
    const session = await SubTrackAuth.requireSession();
    if (!session) return;
    const user = session.user;
    const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "SubTrack user";
    document.getElementById("profileName").textContent = name;
    document.getElementById("profileEmail").textContent = user.email || "—";
    document.getElementById("profileNameDetail").textContent = name;
    document.getElementById("profileEmailDetail").textContent = user.email || "—";
    document.getElementById("profileInitial").textContent = name.trim().charAt(0).toUpperCase();
    document.getElementById("profileCreated").textContent = user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" }) : "—";
    document.getElementById("logoutBtn").addEventListener("click", () => SubTrackAuth.signOut());
})();
