/* Browser-local subscription storage, isolated by Supabase user ID. */
(function () {
    let userId = "guest";
    function storageKey() { return `subtrack_subscriptions_v1_${userId}`; }
    function setUserId(id) { userId = String(id || "guest").replace(/[^a-zA-Z0-9_-]/g, "_"); }
    function getAll() {
        try { const saved = JSON.parse(localStorage.getItem(storageKey()) || "[]"); return Array.isArray(saved) ? saved : []; }
        catch (error) { console.error("Could not read SubTrack data:", error); return []; }
    }
    function saveAll(items) { localStorage.setItem(storageKey(), JSON.stringify(items)); }
    function add(item) { const items = getAll(); items.push({ ...item, id: item.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())) }); saveAll(items); return items; }
    function update(id, changes) { const items = getAll().map(item => item.id === id ? { ...item, ...changes } : item); saveAll(items); return items; }
    function remove(id) { const items = getAll().filter(item => item.id !== id); saveAll(items); return items; }
    function clear() { localStorage.removeItem(storageKey()); }
    window.SubTrackStorage = { setUserId, getAll, saveAll, add, update, remove, clear };
})();
