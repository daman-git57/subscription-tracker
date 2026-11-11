/* Subscription calculations and formatting helpers. */
(function () {
    const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
    const date = value => {
        if (!value) return "Not set";
        const parsed = new Date(value + "T00:00:00");
        return Number.isNaN(parsed.getTime()) ? "Not set" : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    };
    const monthlyAmount = item => {
        const amount = Number(item.amount) || 0;
        if (item.cycle === "weekly") return amount * 52 / 12;
        if (item.cycle === "yearly") return amount / 12;
        return amount;
    };
    const cycleLabel = cycle => ({ weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" }[cycle] || "Monthly");
    function nextDate(item) {
        if (!item.nextDate) return null;
        const d = new Date(item.nextDate + "T00:00:00");
        return Number.isNaN(d.getTime()) ? null : d;
    }
    function daysUntil(item) {
        const due = nextDate(item);
        if (!due) return Infinity;
        const today = new Date(); today.setHours(0,0,0,0);
        return Math.ceil((due - today) / 86400000);
    }
    function getUpcoming(items, days = 30) {
        return items.filter(item => item.status !== "paused" && daysUntil(item) >= 0 && daysUntil(item) <= days)
            .sort((a,b) => daysUntil(a) - daysUntil(b));
    }
    function getMonthlyTotal(items) {
        return items.filter(item => item.status !== "paused").reduce((sum,item) => sum + monthlyAmount(item),0);
    }
    window.SubTrackSubscriptions = { money, date, monthlyAmount, cycleLabel, daysUntil, getUpcoming, getMonthlyTotal };
})();
