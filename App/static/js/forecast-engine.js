window.ForecastEngine = (function() {
    /**
     * Detects recurring transactions (subscriptions) in the given transaction list.
     * Supports Monthly, Quarterly, and Yearly.
     */
    function detectSubscriptions(transactions) {
        const groups = {};
        transactions.forEach(t => {
            const name = t.name.toLowerCase().trim();
            if (!groups[name]) groups[name] = [];
            groups[name].push(t);
        });

        const subscriptions = [];

        for (const name in groups) {
            const group = groups[name].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            if (group.length < 2) continue;

            const intervals = [];
            for (let i = 1; i < group.length; i++) {
                const d1 = new Date(group[i-1].timestamp);
                const d2 = new Date(group[i].timestamp);
                const diffMonths = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
                intervals.push(diffMonths);
            }

            // Determine frequency
            const freqCounts = { 1: 0, 3: 0, 12: 0 };
            intervals.forEach(inv => { if (freqCounts[inv] !== undefined) freqCounts[inv]++; });
            
            let frequency = 'none';
            if ((freqCounts[1] / intervals.length) > 0.6) frequency = 'monthly';
            else if ((freqCounts[3] / intervals.length) > 0.6) frequency = 'quarterly';
            else if ((freqCounts[12] / intervals.length) > 0.6) frequency = 'yearly';

            if (frequency !== 'none') {
                const avgAmount = group.reduce((sum, t) => sum + parseFloat(t.wert), 0) / group.length;
                subscriptions.push({
                    name: group[0].name,
                    amount: avgAmount,
                    lastDate: new Date(group[group.length - 1].timestamp),
                    category: group[0].kategorie,
                    frequency: frequency
                });
            }
        }
        return subscriptions;
    }

    /**
     * Calculates trends per category and removes outliers.
     */
    function calculateCategoryTrends(transactions) {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        
        const categoryData = {}; // { category: { monthKey: { total: 0, count: 0 } } }

        transactions.forEach(t => {
            const d = new Date(t.timestamp);
            if (d >= sixMonthsAgo && d <= now) {
                const cat = t.kategorie;
                const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
                if (!categoryData[cat]) categoryData[cat] = {};
                if (!categoryData[cat][monthKey]) categoryData[cat][monthKey] = { total: 0, count: 0 };
                
                const val = parseFloat(t.wert);
                categoryData[cat][monthKey].total += val;
                categoryData[cat][monthKey].count++;
            }
        });

        const trends = {};
        for (const cat in categoryData) {
            const months = Object.keys(categoryData[cat]).sort();
            if (months.length < 2) {
                trends[cat] = 1.0;
                continue;
            }

            let growthSum = 0;
            let count = 0;
            for (let i = 1; i < months.length; i++) {
                const prev = Math.abs(categoryData[cat][months[i-1]].total);
                const curr = Math.abs(categoryData[cat][months[i]].total);
                
                // Outlier removal: If a month is > 3x the previous, ignore it for trend
                if (prev > 0 && curr < prev * 3) {
                    growthSum += (curr / prev);
                    count++;
                }
            }
            trends[cat] = count > 0 ? Math.max(0.7, Math.min(1.3, growthSum / count)) : 1.0;
        }
        return trends;
    }

    /**
     * Seasonal factor (Year-over-Year comparison).
     */
    function getSeasonalityFactor(transactions, targetMonth) {
        const lastYearSameMonth = transactions.filter(t => {
            const d = new Date(t.timestamp);
            return d.getMonth() === targetMonth && d.getFullYear() === (new Date().getFullYear() - 1);
        });
        
        if (lastYearSameMonth.length === 0) return 1.0;
        
        const avgMonthly = transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.wert)), 0) / (transactions.length / 30 || 1) * 30;
        const targetMonthly = lastYearSameMonth.reduce((sum, t) => sum + Math.abs(parseFloat(t.wert)), 0);
        
        return Math.max(0.8, Math.min(1.5, targetMonthly / (avgMonthly || 1)));
    }

    /**
     * Advanced Forecast.
     */
    function applyForecast(data, transactions, timeframe, startDate, endDate, labels, currentBucketIdx) {
        if (currentBucketIdx < 0 || currentBucketIdx >= labels.length) return data;

        const catTrends = calculateCategoryTrends(transactions);
        const subs = detectSubscriptions(transactions);

        const newRevenue = [...data.revenue];
        const newExpenses = [...data.expenses];

        // Group actuals by category to find "Base" for each
        const categoryBase = {};
        transactions.filter(t => new Date(t.timestamp) >= new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1))
                   .forEach(t => {
                       if (!categoryBase[t.kategorie]) categoryBase[t.kategorie] = { rev: 0, exp: 0 };
                       const val = parseFloat(t.wert);
                       if (val > 0) categoryBase[t.kategorie].rev += val;
                       else categoryBase[t.kategorie].exp += Math.abs(val);
                   });

        for (let i = currentBucketIdx; i < labels.length; i++) {
            let bucketRev = 0;
            let bucketExp = 0;
            const monthsOut = (i - currentBucketIdx);
            
            // 1. Calculate base forecast from categories (Trend + Seasonality)
            const seasonality = getSeasonalityFactor(transactions, (startDate.getMonth() + i) % 12);
            
            for (const cat in categoryBase) {
                const trend = catTrends[cat] || 1.0;
                // Forecast = Base * Trend^time * Seasonality
                bucketRev += categoryBase[cat].rev * Math.pow(trend, monthsOut / 12) * seasonality;
                bucketExp += categoryBase[cat].exp * Math.pow(trend, monthsOut / 12) * seasonality;
            }

            // 2. Add Subscriptions (Quarterly/Yearly check)
            subs.forEach(sub => {
                const targetDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 15);
                const monthsSinceLast = (targetDate.getFullYear() - sub.lastDate.getFullYear()) * 12 + (targetDate.getMonth() - sub.lastDate.getMonth());
                
                let isDue = false;
                if (sub.frequency === 'monthly') isDue = true;
                else if (sub.frequency === 'quarterly' && monthsSinceLast % 3 === 0) isDue = true;
                else if (sub.frequency === 'yearly' && monthsSinceLast % 12 === 0) isDue = true;

                if (isDue) {
                    if (sub.amount > 0) bucketRev += sub.amount;
                    else bucketExp += Math.abs(sub.amount);
                }
            });

            // Random fluctuation for a natural look (3%)
            const jitter = 1 + (Math.random() * 0.06 - 0.03);
            const targetRev = bucketRev * jitter;
            const targetExp = bucketExp * jitter;

            if (i === currentBucketIdx) {
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
        calculateCategoryTrends,
        applyForecast
    };
})();
