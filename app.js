/* Main SubTrack application controller. */
(function () {
    const $ = selector => document.querySelector(selector);
    const $$ = selector => Array.from(document.querySelectorAll(selector));
    let detectedItems = [];
    let selectedDetected = new Set();

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char]));
    }
    function initials(name) { return String(name || "?").trim().charAt(0).toUpperCase(); }
    function toast(message, type = "success") {
        const item = document.createElement("div");
        item.className = "toast" + (type === "error" ? " error" : "");
        item.textContent = message;
        $("#toastRegion").appendChild(item);
        setTimeout(() => item.remove(), 3200);
    }
    function items() { return SubTrackStorage.getAll(); }
    function activeItems() { return items().filter(item => item.status !== "paused"); }

    function setPage(page) {
        const valid = ["dashboard","subscriptions","payments","analytics","settings"];
        if (!valid.includes(page)) page = "dashboard";
        $$(".page-view").forEach(view => view.classList.toggle("active", view.id === "page-" + page));
        $$(".nav-link[data-page]").forEach(link => link.classList.toggle("active", link.dataset.page === page));
        const labels = { dashboard:"Dashboard", subscriptions:"My subscriptions", payments:"Upcoming payments", analytics:"Analytics", settings:"Settings" };
        $("#breadcrumbCurrent").textContent = labels[page];
        $("#sidebar").classList.remove("open");
        renderAll();
    }

    function paymentMarkup(item) {
        const days = SubTrackSubscriptions.daysUntil(item);
        const when = days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : days < 0 ? "Overdue" : `Due in ${days} days`;
        return `<div class="payment-item"><div class="service-icon">${escapeHtml(initials(item.name))}</div><div class="payment-copy"><strong>${escapeHtml(item.name)}</strong><span>${when} · ${escapeHtml(SubTrackSubscriptions.date(item.nextDate))}</span></div><div class="payment-amount">${SubTrackSubscriptions.money(item.amount)}</div></div>`;
    }
    function tableRow(item, withAction = false) {
        const status = item.status === "paused" ? "paused" : "active";
        return `<tr>
            <td><div class="service-cell"><span class="service-icon">${escapeHtml(initials(item.name))}</span>${escapeHtml(item.name)}</div></td>
            <td>${escapeHtml(item.category || "Other")}</td>
            <td><strong>${SubTrackSubscriptions.money(item.amount)}</strong></td>
            <td>${SubTrackSubscriptions.cycleLabel(item.cycle)}</td>
            <td>${SubTrackSubscriptions.date(item.nextDate)}</td>
            <td><span class="status-pill ${status}">${status === "active" ? "● Active" : "● Paused"}</span></td>
            ${withAction ? `<td><button class="row-action" data-action="toggle" data-id="${escapeHtml(item.id)}" title="${status === "active" ? "Pause" : "Activate"}"><i data-lucide="${status === "active" ? "pause" : "play"}"></i></button><button class="row-action" data-action="delete" data-id="${escapeHtml(item.id)}" title="Delete"><i data-lucide="trash-2"></i></button></td>` : ""}
        </tr>`;
    }
    function renderDashboard(data) {
        const active = data.filter(item => item.status !== "paused");
        const monthly = SubTrackSubscriptions.getMonthlyTotal(data);
        const upcoming = SubTrackSubscriptions.getUpcoming(data, 7);
        $("#monthlySpending").textContent = SubTrackSubscriptions.money(monthly);
        $("#activeSubscriptions").textContent = active.length;
        $("#upcomingPayments").textContent = upcoming.length;
        $("#yearlySpending").textContent = SubTrackSubscriptions.money(monthly * 12);
        $("#navSubscriptionCount").textContent = active.length;
        $("#dashboardUpcoming").innerHTML = upcoming.length ? upcoming.slice(0,4).map(paymentMarkup).join("") : '<div class="empty-cell">No payments due in the next 7 days.</div>';
        $("#dashboardSubscriptions").innerHTML = data.length ? data.slice(0,5).map(item => tableRow(item)).join("") : '<tr><td colspan="6" class="empty-cell">No subscriptions yet. Add one or import a CSV statement to get started.</td></tr>';
    }
    function renderSubscriptions(data) {
        const search = ($("#subscriptionSearch")?.value || "").toLowerCase();
        const status = $("#statusFilter")?.value || "all";
        const filtered = data.filter(item => item.name.toLowerCase().includes(search) && (status === "all" || item.status === status));
        $("#subscriptionsTable").innerHTML = filtered.map(item => tableRow(item, true)).join("");
        $("#subscriptionEmpty").hidden = filtered.length > 0;
    }
    function renderPayments(data) {
        const upcoming = SubTrackSubscriptions.getUpcoming(data, 365);
        const next7 = SubTrackSubscriptions.getUpcoming(data, 7);
        const monthly = SubTrackSubscriptions.getMonthlyTotal(data);
        $("#paymentSummary").innerHTML = `<div class="summary-tile"><span>Due in the next 7 days</span><strong>${next7.length}</strong></div><div class="summary-tile"><span>Scheduled in the next year</span><strong>${upcoming.length}</strong></div><div class="summary-tile"><span>Monthly recurring total</span><strong>${SubTrackSubscriptions.money(monthly)}</strong></div>`;
        $("#allPayments").innerHTML = upcoming.length ? upcoming.map(item => {
            const d = new Date(item.nextDate + "T00:00:00");
            return `<div class="full-payment-row"><div class="date-box"><strong>${d.getDate()}</strong><span>${d.toLocaleDateString("en-IN",{month:"short"})}</span></div><div class="service-icon">${escapeHtml(initials(item.name))}</div><div class="payment-copy"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(SubTrackSubscriptions.cycleLabel(item.cycle))} · ${escapeHtml(item.category || "Other")}</span></div><div class="payment-amount">${SubTrackSubscriptions.money(item.amount)}</div></div>`;
        }).join("") : '<div class="empty-cell">No upcoming payments recorded. Add a subscription to create your payment schedule.</div>';
    }
    function renderAnalytics(data) {
        const active = data.filter(item => item.status !== "paused");
        const monthly = SubTrackSubscriptions.getMonthlyTotal(data);
        const most = active.slice().sort((a,b) => SubTrackSubscriptions.monthlyAmount(b) - SubTrackSubscriptions.monthlyAmount(a))[0];
        $("#analyticsMonthly").textContent = SubTrackSubscriptions.money(monthly);
        $("#analyticsYearly").textContent = SubTrackSubscriptions.money(monthly * 12);
        $("#analyticsCount").textContent = active.length;
        $("#mostExpensive").textContent = most ? most.name : "—";
    }
    function renderAll() {
        const data = items();
        renderDashboard(data);
        renderSubscriptions(data);
        renderPayments(data);
        renderAnalytics(data);
        SubTrackAnalytics.render(data);
        if (window.lucide) lucide.createIcons();
    }

    function openModal(id) { $("#" + id).hidden = false; }
    function closeModals() { $$(".modal-backdrop").forEach(modal => modal.hidden = true); }
    function openCsv() { $("#csvResults").hidden = true; $("#dropZone").hidden = false; $("#saveDetectedBtn").disabled = true; detectedItems = []; selectedDetected.clear(); $("#csvFile").value = ""; openModal("csvModal"); }

    function bindEvents() {
        document.addEventListener("click", event => {
            const pageLink = event.target.closest("[data-page]");
            if (pageLink) { event.preventDefault(); setPage(pageLink.dataset.page); }
            const close = event.target.closest("[data-close-modal]");
            if (close) closeModals();
            const action = event.target.closest("[data-action]");
            if (action) {
                const id = action.dataset.id;
                if (action.dataset.action === "delete" && confirm("Delete this subscription?")) {
                    SubTrackStorage.remove(id); toast("Subscription deleted."); renderAll();
                }
                if (action.dataset.action === "toggle") {
                    const current = items().find(item => item.id === id);
                    if (current) { SubTrackStorage.update(id, { status: current.status === "paused" ? "active" : "paused" }); toast("Subscription status updated."); renderAll(); }
                }
            }
        });
        ["importStatementBtn","bannerUploadBtn","topUploadBtn"].forEach(id => $("#" + id)?.addEventListener("click", openCsv));
        $("#addSubscriptionBtn").addEventListener("click", () => {
            $("#subscriptionForm").reset();
            $("#subscriptionForm").elements.nextDate.value = new Date(Date.now() + 30*86400000).toISOString().slice(0,10);
            openModal("subscriptionModal");
        });
        $("#subscriptionForm").addEventListener("submit", event => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            SubTrackStorage.add({ name: form.get("name").trim(), amount: Number(form.get("amount")), cycle: form.get("cycle"), category: form.get("category"), nextDate: form.get("nextDate"), status: "active", source: "manual" });
            closeModals(); toast("Subscription added successfully."); renderAll();
        });
        $("#subscriptionSearch").addEventListener("input", () => renderSubscriptions(items()));
        $("#statusFilter").addEventListener("change", () => renderSubscriptions(items()));
        $("#chartPeriod").addEventListener("change", () => SubTrackAnalytics.render(items()));
        $("#mobileMenuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
        $("#chooseCsvBtn").addEventListener("click", () => $("#csvFile").click());
        $("#csvFile").addEventListener("change", event => { if (event.target.files[0]) handleCsv(event.target.files[0]); });
        const dropZone = $("#dropZone");
        ["dragenter","dragover"].forEach(name => dropZone.addEventListener(name, event => { event.preventDefault(); dropZone.classList.add("dragover"); }));
        ["dragleave","drop"].forEach(name => dropZone.addEventListener(name, event => { event.preventDefault(); dropZone.classList.remove("dragover"); }));
        dropZone.addEventListener("drop", event => { const file = event.dataTransfer.files[0]; if (file) handleCsv(file); });
        $("#saveDetectedBtn").addEventListener("click", () => {
            const selected = detectedItems.filter((_, index) => selectedDetected.has(index));
            if (!selected.length) return;
            const existing = items().map(item => item.name.toLowerCase());
            selected.forEach(item => { if (!existing.includes(item.name.toLowerCase())) SubTrackStorage.add(item); });
            closeModals(); toast(`${selected.length} detected subscription(s) added.`); renderAll();
        });
        $("#exportDataBtn").addEventListener("click", () => {
            const blob = new Blob([JSON.stringify(items(), null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "subtrack-data.json"; a.click(); URL.revokeObjectURL(url);
        });
        $("#clearDataBtn").addEventListener("click", () => {
            if (confirm("This will permanently clear SubTrack data saved in this browser. Continue?")) { SubTrackStorage.clear(); toast("Local SubTrack data cleared."); renderAll(); }
        });
        document.addEventListener("keydown", event => { if (event.key === "Escape") closeModals(); });
    }

    async function handleCsv(file) {
        if (!file.name.toLowerCase().endsWith(".csv")) { toast("Please choose a .csv file.", "error"); return; }
        $("#dropZone").hidden = true;
        $("#csvResults").hidden = false;
        $("#csvResults").innerHTML = '<p class="csv-hint">Scanning your statement…</p>';
        try {
            detectedItems = await SubTrackScanner.parseFile(file);
            selectedDetected = new Set(detectedItems.map((_, index) => index));
            if (!detectedItems.length) {
                $("#csvResults").innerHTML = '<h3>No clear recurring payments found</h3><p class="csv-hint">Try a statement with at least two transactions for the same merchant at a regular interval. You can still add subscriptions manually.</p>';
                $("#saveDetectedBtn").disabled = true;
                return;
            }
            $("#csvResults").innerHTML = `<h3>${detectedItems.length} possible recurring payment(s) found</h3><p class="csv-hint">These are suggestions based on repeated merchant names, similar amounts and regular dates. Check the matches before adding them.</p><div class="detected-list">${detectedItems.map((item,index) => `<label class="detected-row"><input type="checkbox" data-detected="${index}" checked><div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(SubTrackSubscriptions.cycleLabel(item.cycle))} · ${escapeHtml(item.category)} · next expected ${escapeHtml(SubTrackSubscriptions.date(item.nextDate))}</span></div><b>${SubTrackSubscriptions.money(item.amount)}</b></label>`).join("")}</div>`;
            $("#csvResults").querySelectorAll("[data-detected]").forEach(input => input.addEventListener("change", () => {
                const index = Number(input.dataset.detected);
                if (input.checked) selectedDetected.add(index); else selectedDetected.delete(index);
                $("#saveDetectedBtn").disabled = selectedDetected.size === 0;
            }));
            $("#saveDetectedBtn").disabled = selectedDetected.size === 0;
        } catch (error) {
            $("#csvResults").innerHTML = `<p class="csv-hint" style="color:#b42323">${escapeHtml(error.message)}</p><p class="csv-hint">Expected columns: date, description (or merchant), and amount.</p>`;
            $("#saveDetectedBtn").disabled = true;
        }
    }

    async function init() {
        const session = await SubTrackAuth.requireSession();
        if (!session) return;
        SubTrackStorage.setUserId(session.user.id);
        const accountName = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "My account";
        const chip = document.querySelector(".user-chip");
        if (chip) { chip.querySelector(".avatar").textContent = accountName.trim().charAt(0).toUpperCase(); chip.querySelector(".user-meta strong").textContent = accountName; chip.querySelector(".user-meta span").textContent = session.user.email || "Personal workspace"; }
        $("#todayLabel").textContent = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
        bindEvents();
        renderAll();
        if (window.lucide) lucide.createIcons();
    }
    document.addEventListener("DOMContentLoaded", init);
})();
