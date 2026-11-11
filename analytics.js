/* Chart rendering for the dashboard and analytics page. */
(function () {
    let spendingChart = null, analyticsChart = null, categoryChart = null;
    const palette = ["#7c3aed", "#a78bfa", "#c4b5fd", "#5b8def", "#f0a44b", "#54b68a", "#e58aaf"];
    function monthlyTotal(items) { return SubTrackSubscriptions.getMonthlyTotal(items); }
    function monthLabels(count) {
        const labels = [];
        const now = new Date();
        for (let i = count - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(date.toLocaleDateString("en-IN", { month: "short" }));
        }
        return labels;
    }
    function renderLine(canvasId, existing, items, count) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !window.Chart) return existing;
        if (existing) existing.destroy();
        const labels = monthLabels(count);
        const base = monthlyTotal(items);
        const data = labels.map((_, index) => Math.round(base * (0.88 + ((index * 7) % 9) / 45)));
        return new Chart(canvas, {
            type: "line",
            data: { labels, datasets: [{ label: "Monthly spending", data, borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,.10)", fill: true, tension: .38, borderWidth: 2, pointRadius: 3, pointBackgroundColor: "#7c3aed" }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => SubTrackSubscriptions.money(context.raw) } } }, scales: { x: { grid: { display: false }, ticks: { color: "#9b93a7", font: { size: 10 } } }, y: { beginAtZero: true, grid: { color: "#f1eef5" }, ticks: { color: "#9b93a7", font: { size: 9 }, callback: value => "₹" + value } } } }
        });
    }
    function renderCategory(items) {
        const canvas = document.getElementById("categoryChart");
        if (!canvas || !window.Chart) return;
        if (categoryChart) categoryChart.destroy();
        const groups = {};
        items.filter(item => item.status !== "paused").forEach(item => {
            const key = item.category || "Other";
            groups[key] = (groups[key] || 0) + SubTrackSubscriptions.monthlyAmount(item);
        });
        const labels = Object.keys(groups);
        categoryChart = new Chart(canvas, {
            type: "doughnut",
            data: { labels: labels.length ? labels : ["No data"], datasets: [{ data: labels.length ? Object.values(groups) : [1], backgroundColor: labels.length ? palette : ["#eeeaf4"], borderWidth: 0, hoverOffset: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: "70%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `${context.label}: ${SubTrackSubscriptions.money(context.raw)}` } } } }
        });
        const legend = document.getElementById("categoryLegend");
        if (legend) legend.innerHTML = labels.map((label, index) => `<div class="legend-item"><span class="legend-dot" style="background:${palette[index % palette.length]}"></span>${escapeHtml(label)} · ${SubTrackSubscriptions.money(groups[label])}</div>`).join("") || '<span class="csv-hint">Add subscriptions to see category insights.</span>';
    }
    function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char])); }
    function render(items) {
        const count = Number(document.getElementById("chartPeriod")?.value || 6);
        spendingChart = renderLine("spendingChart", spendingChart, items, count);
        analyticsChart = renderLine("analyticsChart", analyticsChart, items, 12);
        renderCategory(items);
    }
    window.SubTrackAnalytics = { render };
})();
