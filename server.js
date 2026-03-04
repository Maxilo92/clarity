require('dotenv').config();
const express = require('express');
const path    = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs      = require('fs');
const app = express();

const APP_DIR = path.join(__dirname, 'App');
const DB_PATH = path.join(APP_DIR, 'db', 'transactions.db');
const CONFIG_PATH = path.join(APP_DIR, 'db', 'user_config.json');

const db = new sqlite3.Database(DB_PATH);

app.use('/static',    express.static(path.join(APP_DIR, 'static')));
app.use('/assets',    express.static(path.join(APP_DIR, 'assets')));
app.use('/templates', express.static(path.join(APP_DIR, 'templates')));
app.get('/', (req, res) => res.redirect('/templates/index.html'));

let fetchFn = globalThis.fetch;
try { if (!fetchFn) fetchFn = require('node-fetch'); } catch (e) {}

const GROQ_KEY   = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// Read version from package.json
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const APP_VERSION = pkg.version;

// Joule's personal context from config
let userConfig = {};
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
            userConfig = JSON.parse(configData);
            userConfig.app_version = APP_VERSION;
            console.log("User Config loaded for: " + (userConfig.user ? userConfig.user.full_name : "Unknown"));
        } else {
            console.error("Config not found at: " + CONFIG_PATH);
        }
    } catch (e) { console.error("Could not load user_config.json", e); }
}
loadConfig();

async function getDatabaseSummary() {
    return new Promise((resolve) => {
        db.all("SELECT * FROM transactions ORDER BY timestamp DESC", [], (err, rows) => {
            if (err || !rows || rows.length === 0) return resolve("No transaction data available.");
            let totalIn = 0, totalOut = 0;
            const cats = {}, months = {};
            
            const now = new Date();
            const currentMonthStr = now.toISOString().substring(0, 7);
            let currentMonthIn = 0, currentMonthOut = 0;

            rows.forEach(r => {
                const v = parseFloat(r.wert) || 0;
                if (v >= 0) totalIn += v; else totalOut += Math.abs(v);
                cats[r.kategorie] = (cats[r.kategorie] || 0) + v;
                const m = r.timestamp.substring(0, 7);
                if (m === currentMonthStr) {
                    if (v >= 0) currentMonthIn += v; else currentMonthOut += Math.abs(v);
                }
            });

            let s = "### FINANCIAL ANALYTICS CONTEXT (STRICTLY CONFIDENTIAL) ###\n";
            s += `Global Version: v${APP_VERSION}\n`;
            s += `Current Month (${currentMonthStr}): Revenue: +${currentMonthIn.toFixed(2)}€ | Expenses: -${currentMonthOut.toFixed(2)}€ | Surplus: ${(currentMonthIn - currentMonthOut).toFixed(2)}€\n`;
            s += `Lifetime Balance: ${(totalIn - totalOut).toFixed(2)}€ (Total In: ${totalIn.toFixed(2)}€ / Total Out: ${totalOut.toFixed(2)}€)\n\n`;
            
            s += "### TOP CATEGORIES (NET BALANCE) ###\n";
            Object.entries(cats).sort((a,b) => a[1]-b[1]).slice(0, 5).forEach(([c,v]) => s += `- ${c}: ${v.toFixed(2)}€\n`);
            
            s += "\n### RECENT 10 TRANSACTIONS ###\n";
            rows.slice(0, 10).forEach(r => s += `- [${r.timestamp.split('T')[0]}] ${r.name}: ${parseFloat(r.wert).toFixed(2)}€ (${r.kategorie})\n`);
            resolve(s);
        });
    });
}

app.use(express.json());

// Config API
app.get("/api/config", (req, res) => {
    res.json(userConfig);
});

app.post("/api/config", (req, res) => {
    // Deep merge user object if provided
    if (req.body.user) {
        userConfig.user = { ...userConfig.user, ...req.body.user };
    }
    // Merge other top-level keys
    for (let key in req.body) {
        if (key !== 'user') userConfig[key] = req.body[key];
    }

    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(userConfig, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Could not save config" });
    }
});

app.get("/api/transactions", (req, res) => {
    const { id, limit=25, offset=0, category, search, date, sort="timestamp", order="DESC" } = req.query;
    let query = "SELECT * FROM transactions", where = [], params = [];
    if (id) { const idNum = Number(id); if (!isNaN(idNum)) { where.push("id = ?"); params.push(idNum); } else { where.push("id = ?"); params.push(id); } }
    if (category && category !== "all") { where.push("kategorie = ?"); params.push(category); }
    if (date) { where.push("timestamp LIKE ?"); params.push(`${date}%`); }
    if (search) { where.push("(name LIKE ? OR sender LIKE ? OR empfaenger LIKE ? OR kategorie LIKE ?)"); const p = `%${search}%`; params.push(p,p,p,p); }
    if (where.length) query += " WHERE " + where.join(" AND ");
    query += ` ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    db.all(query, params, (err, rows) => err ? res.status(500).json({error:err.message}) : res.json({eintraege:rows}));
});

app.post('/api/transactions', (req, res) => {
    const { name, kategorie, wert, sender, empfaenger } = req.body;
    db.run("INSERT INTO transactions (id, name, kategorie, wert, timestamp, sender, empfaenger) VALUES (?,?,?,?,?,?,?)",
        [Date.now(), name||"Unbenannt", kategorie||"Sonstiges", parseFloat(wert||0), new Date().toISOString(), sender||"", empfaenger||""],
        function(err) { err ? res.status(500).json({error:err.message}) : res.json({success:true}); }
    );
});

app.post('/api/chat', async (req, res) => {
  try {
    const summary = await getDatabaseSummary();
    const clientMessages = (req.body.messages || []).map(({attachment, ...rest}) => rest).filter(m => m.role !== 'system');
    
    const nickname = userConfig.user?.nickname || userConfig.user?.full_name || "Nutzer";
    const userContext = userConfig.user ? 
        `NUTZER-PROFIL:\n- Name: ${userConfig.user.full_name}\n- Nickname: ${userConfig.user.nickname || "N/A"}\n- E-Mail: ${userConfig.user.email}\n- Abteilung: ${userConfig.user.department}\n- Standort: ${userConfig.user.location}\n- ID: ${userConfig.user.employee_id}\n` : "";

    const systemPrompt = `You are Joule, the highly specialized AI core of "Clarity" (Financial Intelligence Platform). 
PERSONALITY: Professional, discrete, sharp, and proactive. You are not just a chatbot; you are a financial advisor.

${userContext}
${summary}

### CORE DIRECTIVES:
1. PERSONALIZED GREETING: You MUST always address the user by their name (${nickname}) in the initial greeting of a session.
2. ANALYTIC DEPTH: Provide insights, not just numbers. Identify trends (e.g., "Your spending in Leisure is 15% higher this month").
3. PROACTIVE ADVICE: If you see a high expense or a deficit in the current month, suggest optimizations. Be encouraging but realistic.
4. STYLE: Max 3-4 sentences. Use Markdown (**bold**) for all currency amounts and categories.
5. NO BRACKETS: Never use [ ] in your final output.
6. CLARITY VERSION: You are operating on Clarity Global Version ${APP_VERSION}.

Current Date: ${new Date().toISOString().split('T')[0]}`;

    const resp = await fetchFn("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + GROQ_KEY },
        body: JSON.stringify({ model: GROQ_MODEL, messages: [{role:"system", content:systemPrompt}, ...clientMessages] })
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) { res.status(500).json({error: 'Proxy error'}); }
});

app.listen(3000, () => console.log('Joule System Perfected on Port 3000'));
