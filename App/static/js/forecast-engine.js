window.ForecastEngine = (function() {
    /**
     * Detects recurring transactions (subscriptions) in the given transaction list.
     * Returns an array of objects representing identified subscriptions.
     */
    function detectSubscriptions(transactions) {
        const groups = {};
        
        // Group by name (lowercase)
        transactions.forEach(t => {
            const name = t.name.toLowerCase().trim();
            if (!groups[name]) groups[name] = [];
            groups[name].push(t);
        });

        const subscriptions = [];

        for (const name in groups) {
            const group = groups[name].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            if (group.length < 2) continue;

            // Check for regular intervals (mostly monthly)
            const intervals = [];
            for (let i = 1; i < group.length; i++) {
                const d1 = new Date(group[i-1].timestamp);
                const d2 = new Date(group[i].timestamp);
                const diffMonths = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
                intervals.push(diffMonths);
            }

            // Simple check: if most intervals are 1 month, it's likely a monthly subscription
            const monthlyCount = intervals.filter(inv => inv === 1).length;
            const isMonthly = (monthlyCount / intervals.length) > 0.7;

            if (isMonthly) {
                // Calculate average amount
                const avgAmount = group.reduce((sum, t) => sum + parseFloat(t.wert), 0) / group.length;
                
                subscriptions.push({
                    name: group[0].name,
                    amount: avgAmount,
                    lastDate: new Date(group[group.length - 1].timestamp),
                    category: group[0].kategorie,
                    frequency: 'monthly'
                });
            }
        }

        return subscriptions;
    }

    /**
     * Calculates trends for revenue and expenses.
     * Returns an object with growth rates.
     */
    function calculateTrends(transactions, timeframe) {
        // We look at the last 6 months to determine a trend
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        
        const monthlyData = {};

        transactions.forEach(t => {
            const d = new Date(t.timestamp);
            if (d >= sixMonthsAgo && d <= now) {
                const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
                if (!monthlyData[monthKey]) monthlyData[monthKey] = { rev: 0, exp: 0 };
                const val = parseFloat(t.wert);
                if (val > 0) monthlyData[monthKey].rev += val;
                else monthlyData[monthKey].exp += Math.abs(val);
            }
        });

        const sortedMonths = Object.keys(monthlyData).sort();
        if (sortedMonths.length < 2) return { revenueTrend: 1.0, expenseTrend: 1.0 };

        // Calculate simple average growth rate
        let revGrowth = 0;
        let expGrowth = 0;
        let count = 0;

        for (let i = 1; i < sortedMonths.length; i++) {
            const prev = monthlyData[sortedMonths[i-1]];
            const curr = monthlyData[sortedMonths[i]];
            
            if (prev.rev > 0) revGrowth += (curr.rev / prev.rev);
            else if (curr.rev > 0) revGrowth += 1.05; // Default assumption if previous was 0
            else revGrowth += 1.0;

            if (prev.exp > 0) expGrowth += (curr.exp / prev.exp);
            else if (curr.exp > 0) expGrowth += 1.05;
            else expGrowth += 1.0;

            count++;
        }

        return {
            revenueTrend: Math.max(0.8, Math.min(1.2, revGrowth / count)), // Cap trend to reasonable values
            expenseTrend: Math.max(0.8, Math.min(1.2, expGrowth / count))
        };
    }

    /**
     * Generates a forecast for future buckets.
     */
    function generateForecast(transactions, timeframe, startDate, endDate, labels, currentBucketIdx) {
        const subs = detectSubscriptions(transactions);
        const trends = calculateTrends(transactions, timeframe);
        
        const forecastRevenue = new Array(labels.length).fill(0);
        const forecastExpenses = new Array(labels.length).fill(0);

        // We only forecast for buckets AFTER today
        if (currentBucketIdx < 0) return { revenue: forecastRevenue, expenses: forecastExpenses };

        // Base values for trends (average of last 3 actual buckets)
        const lastActualIdx = currentBucketIdx;
        let baseRev = 0;
        let baseExp = 0;
        let baseCount = 0;

        // Note: this is a simplification. In a real app, we'd distinguish between 
        // recurring (subs) and non-recurring (trend-based) amounts.
        
        // For simplicity:
        // 1. We apply subscriptions to future months
        // 2. We apply trends to the non-subscription part, or just generally.

        // Let's use a more robust approach for the demo:
        // Project subscriptions + projected "other" expenses based on trend.

        for (let i = currentBucketIdx + 1; i < labels.length; i++) {
            let bucketDate;
            // Approximate date for the bucket
            if (timeframe === 'year') {
                bucketDate = new Date(startDate.getFullYear(), i, 15);
            } else if (timeframe === 'month') {
                bucketDate = new Date(startDate.getFullYear(), startDate.getMonth(), i + 1);
            } else if (timeframe === 'week') {
                bucketDate = new Date(startDate);
                bucketDate.setDate(startDate.getDate() + i);
            } else {
                bucketDate = new Date(); // Fallback
            }

            // 1. Subscriptions
            subs.forEach(sub => {
                if (sub.frequency === 'monthly') {
                    // If bucket is in a different month than lastDate, or monthly view
                    if (timeframe === 'year') {
                        forecastRevenue[i] += sub.amount > 0 ? sub.amount : 0;
                        forecastExpenses[i] += sub.amount < 0 ? Math.abs(sub.amount) : 0;
                    } else if (timeframe === 'month') {
                        // Monthly subscriptions usually happen once a month. 
                        // We check if the day matches.
                        if (bucketDate.getDate() === sub.lastDate.getDate()) {
                            forecastRevenue[i] += sub.amount > 0 ? sub.amount : 0;
                            forecastExpenses[i] += sub.amount < 0 ? Math.abs(sub.amount) : 0;
                        }
                    }
                }
            });

            // 2. Trend-based "Other" expenses
            // We take the last bucket's values and apply the trend
            const monthsAhead = (i - currentBucketIdx);
            
            // Just carry over and apply trend for non-subscription parts? 
            // Too complex for JS-only without better data separation.
            // Simpler: Carry over last known values and multiply by trend^monthsAhead
            
            // If we already added subscriptions, we might overcount.
            // Let's just do a simple trended carry-over if no subscriptions were found for that bucket.
            if (forecastRevenue[i] === 0) {
                forecastRevenue[i] = transactions.filter(t => parseFloat(t.wert) > 0).slice(-20).reduce((a,b)=>a+parseFloat(b.wert), 0) / 20 * (timeframe === 'year' ? 30 : 1) * Math.pow(trends.revenueTrend, monthsAhead / (timeframe === 'year' ? 1 : 12));
            }
             if (forecastExpenses[i] === 0) {
                forecastExpenses[i] = transactions.filter(t => parseFloat(t.wert) < 0).slice(-50).reduce((a,b)=>a+Math.abs(parseFloat(b.wert)), 0) / 50 * (timeframe === 'year' ? 30 : 1) * Math.pow(trends.expenseTrend, monthsAhead / (timeframe === 'year' ? 1 : 12));
            }
        }

        return { revenue: forecastRevenue, expenses: forecastExpenses };
    }

    /**
     * More advanced forecast that integrates into the existing dashboard data flow.
     */
    function applyForecast(data, transactions, timeframe, startDate, endDate, labels, currentBucketIdx) {
        if (currentBucketIdx < 0 || currentBucketIdx >= labels.length - 1) return data;

        const trends = calculateTrends(transactions, timeframe);
        const subs = detectSubscriptions(transactions);

        const newRevenue = [...data.revenue];
        const newExpenses = [...data.expenses];

        // Identify which expenses are "recurring"
        const recurringExpensesTotal = subs.filter(s => s.amount < 0).reduce((sum, s) => sum + Math.abs(s.amount), 0);
        const recurringRevenueTotal = subs.filter(s => s.amount > 0).reduce((sum, s) => sum + s.amount, 0);

        // Average of last 3 actual buckets to get "base" for non-recurring
        let avgNonRecExp = 0;
        let avgNonRecRev = 0;
        const lookback = Math.min(3, currentBucketIdx + 1);
        for(let i = currentBucketIdx; i > currentBucketIdx - lookback; i--) {
            avgNonRecExp += (data.expenses[i] || 0);
            avgNonRecRev += (data.revenue[i] || 0);
        }
        avgNonRecExp /= lookback;
        avgNonRecRev /= lookback;

        // Subtract recurring from base to avoid double counting if they happened in those months
        // (Simplified: we just use 70% of the last value as base if recurring is high)
        const baseExp = Math.max(avgNonRecExp * 0.5, avgNonRecExp - recurringExpensesTotal);
        const baseRev = Math.max(avgNonRecRev * 0.5, avgNonRecRev - recurringRevenueTotal);

        // Start from currentBucketIdx to fill up the "dent" if it's incomplete
        for (let i = currentBucketIdx; i < labels.length; i++) {
            const monthsOut = (timeframe === 'year' || timeframe === 'last_year') ? (i - currentBucketIdx) : (i - currentBucketIdx) / 30;
            
            // Forecast = Subscriptions + (Base * Trend^time)
            let bucketRev = recurringRevenueTotal + (baseRev * Math.pow(trends.revenueTrend, monthsOut));
            let bucketExp = recurringExpensesTotal + (baseExp * Math.pow(trends.expenseTrend, monthsOut));

            // Add some "random" fluctuation for realism
            const fluctuation = 1 + (Math.random() * 0.1 - 0.05);
            const targetRev = bucketRev * fluctuation;
            const targetExp = bucketExp * fluctuation;

            if (i === currentBucketIdx) {
                // Only fill up if actuals are lower than forecast (smoothing the dent)
                newRevenue[i] = Math.max(newRevenue[i], targetRev);
                newExpenses[i] = Math.max(newExpenses[i], targetExp);
            } else {
                newRevenue[i] = targetRev;
                newExpenses[i] = targetExp;
            }
        }

        return { revenue: newRevenue, expenses: newExpenses };
    }

    return {
        detectSubscriptions,
        calculateTrends,
        applyForecast
    };
})();
