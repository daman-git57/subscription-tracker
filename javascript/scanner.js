/* CSV parser and recurring-payment detector.
   Expected CSV columns: date, description/merchant, amount.
   The detector is a simple heuristic. Always review matches before saving. */
(function () {
    const DATE_KEYS = ["date", "transaction date", "posted date", "txn date"];
    const DESC_KEYS = ["description", "merchant", "narration", "details", "transaction details", "name", "payee"];
    const AMOUNT_KEYS = ["amount", "debit", "withdrawal", "transaction amount"];

    function normalizeKey(key) { return String(key || "").trim().toLowerCase().replace(/[_-]/g, " "); }
    function findColumn(headers, choices) {
        return headers.find(header => choices.includes(normalizeKey(header))) ||
            headers.find(header => choices.some(choice => normalizeKey(header).includes(choice)));
    }
    function parseDate(value) {
        if (!value) return null;
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed;
        const match = String(value).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
        if (match) {
            const year = Number(match[3].length === 2 ? "20" + match[3] : match[3]);
            return new Date(year, Number(match[2]) - 1, Number(match[1]));
        }
        return null;
    }
    function parseAmount(value) {
        if (typeof value === "number") return value;
        const cleaned = String(value || "").replace(/[₹,$\s]/g, "").replace(/,/g, "");
        const number = Number(cleaned);
        return Number.isFinite(number) ? number : NaN;
    }
    function cleanMerchant(value) {
        return String(value || "").toLowerCase()
            .replace(/\b(upi|imps|neft|card|debit|standing instruction|autopay|mandate|payment|txn|transaction|ref|reference)\b/g, " ")
            .replace(/[0-9*#/_-]+/g, " ")
            .replace(/\s+/g, " ").trim();
    }
    function displayMerchant(value) {
        const cleaned = cleanMerchant(value);
        return cleaned.split(" ").filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") || "Unknown service";
    }
    function guessCycle(dates) {
        if (dates.length < 2) return "monthly";
        const gaps = [];
        for (let i = 1; i < dates.length; i++) gaps.push(Math.round((dates[i] - dates[i - 1]) / 86400000));
        const average = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
        if (average >= 5 && average <= 10) return "weekly";
        if (average >= 25 && average <= 38) return "monthly";
        if (average >= 330 && average <= 400) return "yearly";
        return null;
    }
    function scanRows(rows) {
        if (!rows || !rows.length) throw new Error("The CSV file appears to be empty.");
        const headers = Object.keys(rows[0] || {});
        const dateColumn = findColumn(headers, DATE_KEYS);
        const descColumn = findColumn(headers, DESC_KEYS);
        const amountColumn = findColumn(headers, AMOUNT_KEYS);
        if (!dateColumn || !descColumn || !amountColumn) {
            throw new Error("Could not identify the required columns. Your CSV needs date, description/merchant, and amount columns.");
        }

        const groups = new Map();
        rows.forEach(row => {
            const date = parseDate(row[dateColumn]);
            const description = row[descColumn];
            const rawAmount = parseAmount(row[amountColumn]);
            if (!date || !description || !Number.isFinite(rawAmount) || rawAmount === 0) return;
            // Bank exports often show debit as a positive value; absolute value is used for subscription matching.
            const merchant = cleanMerchant(description);
            if (!merchant || merchant.length < 3) return;
            const key = merchant;
            if (!groups.has(key)) groups.set(key, { merchant: displayMerchant(description), entries: [] });
            groups.get(key).entries.push({ date, amount: Math.abs(rawAmount) });
        });

        const detected = [];
        groups.forEach(group => {
            const entries = group.entries.sort((a, b) => a.date - b.date);
            if (entries.length < 2) return;
            const cycle = guessCycle(entries.map(entry => entry.date));
            if (!cycle) return;
            const amounts = entries.map(entry => entry.amount);
            const average = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
            const consistent = amounts.every(value => Math.abs(value - average) / Math.max(average, 1) <= 0.25);
            if (!consistent) return;
            const latest = entries[entries.length - 1].date;
            const nextDate = new Date(latest);
            if (cycle === "weekly") nextDate.setDate(nextDate.getDate() + 7);
            if (cycle === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
            if (cycle === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);
            detected.push({
                name: group.merchant,
                amount: Math.round(average * 100) / 100,
                cycle,
                category: "Other",
                nextDate: nextDate.toISOString().slice(0, 10),
                status: "active",
                source: "csv"
            });
        });
        return detected;
    }

    function parseFile(file) {
        return new Promise((resolve, reject) => {
            if (!window.Papa) return reject(new Error("CSV parser did not load. Check your internet connection and refresh the page."));
            Papa.parse(file, {
                header: true, skipEmptyLines: true, dynamicTyping: false,
                complete: result => {
                    if (result.errors && result.errors.length && !result.data.length) return reject(new Error("Could not read this CSV file."));
                    try { resolve(scanRows(result.data)); } catch (error) { reject(error); }
                },
                error: error => reject(error)
            });
        });
    }
    window.SubTrackScanner = { parseFile, scanRows };
})();
