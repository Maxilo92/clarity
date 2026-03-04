require('dotenv').config();
const express = require('express');
const path    = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs      = require('fs');
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const app = express();

const APP_DIR = path.join(__dirname, 'App');
const DB_PATH = path.join(APP_DIR, 'db', 'system.db');

// Main directory DB
const sysDb = new sqlite3.Database(DB_PATH);

// Helper to get company DB connection (Strictly isolated)
const companyDbs = {};
function getCompanyDb(companyId) {
    if (!companyId || isNaN(companyId)) throw new Error("Valid Company ID required.");
    if (companyDbs[companyId]) return companyDbs[companyId];
    
    const dbPath = path.join(APP_DIR, 'db', `company_${companyId}.db`);
    const cDb = new sqlite3.Database(dbPath);
    
    // Initialize company-specific schema
    cDb.serialize(() => {
        // Users
        cDb.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        )`);
        // Transactions
        cDb.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY,
            name TEXT, kategorie TEXT, wert REAL, timestamp TEXT, sender TEXT, empfaenger TEXT, user_id INTEGER
        )`);
        // Invites
        cDb.run(`CREATE TABLE IF NOT EXISTS invites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL, used BOOLEAN DEFAULT 0, expires_at TEXT
        )`);
        // User-specific Settings
        cDb.run(`CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY,
            nickname TEXT,
            theme TEXT DEFAULT 'light',
            notifications_enabled BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);
    });
    
    companyDbs[companyId] = cDb;
    return cDb;
}

app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use('/static',    express.static(path.join(APP_DIR, 'static')));
app.use('/assets',    express.static(path.join(APP_DIR, 'assets')));

// --- Page Routes ---
app.get('/', (req, res) => res.sendFile(path.join(APP_DIR, 'templates', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(APP_DIR, 'templates', 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(APP_DIR, 'templates', 'signup.html')));
app.get('/register-company', (req, res) => res.sendFile(path.join(APP_DIR, 'templates', 'register-company.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(APP_DIR, 'templates', 'dashboard.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(APP_DIR, 'templates', 'settings.html')));
app.get('/support', (req, res) => res.sendFile(path.join(APP_DIR, 'templates', 'support.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(APP_DIR, 'templates', 'admin.html')));
app.get('/logout', (req, res) => res.sendFile(path.join(APP_DIR, 'templates', 'logout.html')));
app.get('/tos', (req, res) => res.sendFile(path.join(APP_DIR, 'templates', 'tos.html')));
app.get('/impressum', (req, res) => res.sendFile(path.join(APP_DIR, 'templates', 'impressum.html')));

app.get('/templates/:page.html', (req, res) => {
    const page = req.params.page;
    const target = page === 'index' ? '/' : '/' + page;
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    res.redirect(301, target + queryString);
});

const APP_VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).version;
let fetchFn = globalThis.fetch || require('node-fetch');

async function getDatabaseSummary(companyId, userId) {
    if (!companyId) return "No company context available.";
    return new Promise((resolve) => {
        try {
            const cDb = getCompanyDb(companyId);
            cDb.all("SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10", [userId], (err, rows) => {
                if (err || !rows || rows.length === 0) return resolve("No transaction data available for this user.");
                let totalIn = 0, totalOut = 0;
                rows.forEach(r => {
                    const v = parseFloat(r.wert) || 0;
                    if (v >= 0) totalIn += v; else totalOut += Math.abs(v);
                });
                let s = `### FINANCIAL CONTEXT (LAST 10) ###\n`;
                s += `Total Balance: ${(totalIn - totalOut).toFixed(2)}€\n`;
                rows.slice(0, 5).forEach(r => s += `- [${r.timestamp.split('T')[0]}] ${r.name}: ${parseFloat(r.wert).toFixed(2)}€ (${r.kategorie})\n`);
                resolve(s);
            });
        } catch(e) { resolve("Error accessing database context."); }
    });
}

// --- API ---

app.get('/api/companies/domain', (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: "Company name required" });
    const domain = name.toLowerCase().replace(/\s+/g, '-') + ".com";
    res.json({ domain });
});

// --- Onboarding & Auth ---

app.post('/api/onboarding/admin', async (req, res) => {
    const { company_name, domain, full_name, email, password } = req.body;
    sysDb.get("SELECT email FROM user_index WHERE email = ?", [email], async (err, indexed) => {
        if (indexed) return res.status(400).json({ error: "A user with this email already exists." });
        sysDb.run("INSERT INTO companies (name, domain) VALUES (?, ?)", [company_name, domain], async function(err) {
            if (err) return res.status(400).json({ error: "Domain already registered." });
            const companyId = this.lastID;
            const cDb = getCompanyDb(companyId);
            try {
                const hashedPassword = await bcrypt.hash(password, 10);
                cDb.run("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)", 
                    [full_name, email, hashedPassword, 'admin'], function(err) {
                    if (err) { sysDb.run("DELETE FROM companies WHERE id = ?", [companyId]); return res.status(500).json({ error: "Failed." }); }
                    const userId = this.lastID;
                    sysDb.run("INSERT INTO user_index (email, company_id) VALUES (?, ?)", [email, companyId], () => {
                        res.json({ success: true, company_id: companyId, user_id: userId });
                    });
                });
            } catch (e) { res.status(500).json({ error: "Security failed." }); }
        });
    });
});

app.post('/api/users/signup', async (req, res) => {
    const { full_name, email, password, company_id, role, invite_code } = req.body;
    const cDb = getCompanyDb(company_id);
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const completeSignup = () => {
            cDb.run("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)", 
                [full_name, email, hashedPassword, role || 'user'], function(err) {
                if (err) return res.status(400).json({ error: "Email already taken." });
                const userId = this.lastID;
                sysDb.run("INSERT INTO user_index (email, company_id) VALUES (?, ?)", [email, company_id], (err) => {
                    res.json({ success: true, user_id: userId });
                });
            });
        };
        if (role === 'user') {
            cDb.get("SELECT * FROM invites WHERE code = ? AND used = 0", [invite_code], (err, inv) => {
                if (err || !inv) return res.status(400).json({ error: "Invalid invite code." });
                cDb.run("UPDATE invites SET used = 1 WHERE code = ?", [invite_code]);
                completeSignup();
            });
        } else { completeSignup(); }
    } catch (e) { res.status(500).json({ error: "Hashing failed." }); }
});

app.post('/api/users/login', (req, res) => {
    const { email, password } = req.body;
    sysDb.get("SELECT company_id FROM user_index WHERE email = ?", [email], (err, index) => {
        if (err || !index) return res.status(401).json({ error: "Invalid credentials." });
        const cDb = getCompanyDb(index.company_id);
        cDb.get("SELECT * FROM users WHERE email = ?", [email], async (err, row) => {
            if (err || !row) return res.status(401).json({ error: "Invalid credentials." });
            if (!(await bcrypt.compare(password, row.password))) return res.status(401).json({ error: "Invalid credentials." });
            sysDb.get("SELECT name FROM companies WHERE id = ?", [index.company_id], (err, comp) => {
                res.json({ success: true, user: { ...row, company_id: index.company_id, company_name: comp ? comp.name : "Organization" } });
            });
        });
    });
});

// --- Management ---

app.post('/api/invites', (req, res) => {
    const { company_id, expires_in_hours } = req.body;
    const cDb = getCompanyDb(company_id);
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    let expiresAt = expires_in_hours ? new Date(Date.now() + expires_in_hours * 3600000).toISOString() : null;
    cDb.run("INSERT INTO invites (code, expires_at) VALUES (?, ?)", [code, expiresAt], (err) => res.json({ success: true, code, expires_at: expiresAt }));
});

app.get('/api/invites', (req, res) => {
    const { company_id } = req.query;
    const cDb = getCompanyDb(company_id);
    cDb.all("SELECT * FROM invites ORDER BY id DESC", [], (err, rows) => res.json({ invites: rows || [] }));
});

app.post('/api/invites/cancel', (req, res) => {
    const { code, company_id } = req.body;
    const cDb = getCompanyDb(company_id);
    cDb.run("UPDATE invites SET used = 1 WHERE code = ?", [code], () => res.json({ success: true }));
});

app.get('/api/invites/validate', (req, res) => {
    const { code } = req.query;
    const dbDir = path.join(APP_DIR, 'db');
    const files = fs.readdirSync(dbDir).filter(f => f.startsWith('company_'));
    let processed = 0; let found = false;
    if (files.length === 0) return res.status(404).json({ error: "No companies." });
    files.forEach(file => {
        const compId = file.match(/\d+/)[0];
        const cDb = getCompanyDb(compId);
        cDb.get("SELECT * FROM invites WHERE code = ? AND used = 0", [code], (err, row) => {
            processed++;
            if (row && !found) {
                found = true;
                sysDb.get("SELECT * FROM companies WHERE id = ?", [compId], (err, comp) => {
                    res.json({ success: true, invite: { ...row, company_id: compId, company_name: comp.name, company_domain: comp.domain } });
                });
            } else if (processed === files.length && !found) { res.status(404).json({ error: "Invalid invite code." }); }
        });
    });
});

app.get('/api/users', (req, res) => {
    const { company_id } = req.query;
    const cDb = getCompanyDb(company_id);
    cDb.all("SELECT id, full_name, email, role FROM users", [], (err, rows) => res.json({ users: rows || [] }));
});

app.put('/api/users/:id', (req, res) => {
    const { company_id, role } = req.body;
    const cDb = getCompanyDb(company_id);
    const userId = req.params.id;
    if (role === 'user') {
        cDb.get("SELECT role FROM users WHERE id = ?", [userId], (err, user) => {
            if (user && user.role === 'admin') {
                cDb.get("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'", (err, row) => {
                    if (row.cnt <= 1) return res.status(403).json({ error: "last_admin", message: "Cannot demote the last administrator." });
                    cDb.run("UPDATE users SET role = ? WHERE id = ?", [role, userId], () => res.json({ success: true }));
                });
            } else { cDb.run("UPDATE users SET role = ? WHERE id = ?", [role, userId], () => res.json({ success: true })); }
        });
    } else { cDb.run("UPDATE users SET role = ? WHERE id = ?", [role, userId], () => res.json({ success: true })); }
});

app.delete('/api/users/:id', (req, res) => {
    const { company_id } = req.query;
    const cDb = getCompanyDb(company_id);
    const userId = req.params.id;
    cDb.get("SELECT role, email FROM users WHERE id = ?", [userId], (err, user) => {
        if (!user) return res.status(404).json({ error: "Not found." });
        if (user.role === 'admin') {
            cDb.get("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'", (err, row) => {
                if (row.cnt <= 1) return res.status(403).json({ error: "last_admin", message: "Cannot delete last admin." });
                cDb.run("DELETE FROM users WHERE id = ?", [userId], () => {
                    sysDb.run("DELETE FROM user_index WHERE email = ?", [user.email]);
                    cDb.run("DELETE FROM user_settings WHERE user_id = ?", [userId]);
                    res.json({ success: true });
                });
            });
        } else {
            cDb.run("DELETE FROM users WHERE id = ?", [userId], () => {
                sysDb.run("DELETE FROM user_index WHERE email = ?", [user.email]);
                cDb.run("DELETE FROM user_settings WHERE user_id = ?", [userId]);
                res.json({ success: true });
            });
        }
    });
});

app.get('/api/config', (req, res) => {
    const { user_id, company_id } = req.query;
    if (!user_id || !company_id) return res.json({ app_version: APP_VERSION });
    try {
        sysDb.get("SELECT id FROM companies WHERE id = ?", [company_id], (err, comp) => {
            if (err || !comp) return res.status(404).json({ error: "Not found" });
            const cDb = getCompanyDb(company_id);
            cDb.get("SELECT id FROM users WHERE id = ?", [user_id], (err, user) => {
                if (err || !user) return res.status(404).json({ error: "Not found" });
                cDb.get("SELECT * FROM user_settings WHERE user_id = ?", [user_id], (err, row) => res.json({ ...row, app_version: APP_VERSION }));
            });
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config', (req, res) => {
    const { user_id, company_id, nickname } = req.body;
    const cDb = getCompanyDb(company_id);
    cDb.run("INSERT INTO user_settings (user_id, nickname) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET nickname=excluded.nickname", [user_id, nickname], () => res.json({ success: true }));
});

// --- Transactions ---

app.get("/api/transactions", (req, res) => {
    const { company_id, user_id, id, limit=25, offset=0, category, search, date, sort="timestamp", order="DESC" } = req.query;
    if (!company_id) return res.status(400).json({ error: "company_id required" });
    try {
        const cDb = getCompanyDb(company_id);
        let query = "SELECT * FROM transactions", where = [], params = [];
        if (user_id) { where.push("user_id = ?"); params.push(parseInt(user_id)); }
        if (id) { const idNum = Number(id); if (!isNaN(idNum)) { where.push("id = ?"); params.push(idNum); } else { where.push("id = ?"); params.push(id); } }
        if (category && category !== "all") { where.push("kategorie = ?"); params.push(category); }
        if (date) { where.push("timestamp LIKE ?"); params.push(`${date}%`); }
        if (search) { where.push("(name LIKE ? OR sender LIKE ? OR empfaenger LIKE ? OR kategorie LIKE ? OR CAST(wert AS TEXT) LIKE ?)"); const p = `%${search}%`; params.push(p,p,p,p,p); }
        if (where.length) query += " WHERE " + where.join(" AND ");
        const allowedCols = ["timestamp", "wert", "name", "kategorie", "sender", "empfaenger"];
        const finalSort = allowedCols.includes(sort) ? sort : "timestamp";
        query += ` ORDER BY ${finalSort} ${order.toUpperCase() === "ASC" ? "ASC" : "DESC"} LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        cDb.all(query, params, (err, rows) => res.json({ eintraege: rows || [] }));
    } catch(e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/transactions', (req, res) => {
    const { company_id, user_id, name, kategorie, wert, sender, empfaenger, timestamp } = req.body;
    const cDb = getCompanyDb(company_id);
    cDb.run("INSERT INTO transactions (id, name, kategorie, wert, timestamp, sender, empfaenger, user_id) VALUES (?,?,?,?,?,?,?,?)",
        [Date.now() + Math.random(), name || "Unbenannt", kategorie || "Sonstiges", parseFloat(wert || 0), timestamp || new Date().toISOString(), sender || "", empfaenger || "", user_id],
        () => res.json({ success: true }));
});

app.put('/api/transactions/:id', (req, res) => {
    const { company_id, name, kategorie, wert, sender, empfaenger, timestamp } = req.body;
    const cDb = getCompanyDb(company_id);
    cDb.run("UPDATE transactions SET name = ?, kategorie = ?, wert = ?, sender = ?, empfaenger = ?, timestamp = ? WHERE id = ?", [name, kategorie, parseFloat(wert), sender, empfaenger, timestamp, req.params.id], () => res.json({ success: true }));
});

app.delete('/api/transactions/:id', (req, res) => {
    const { company_id } = req.query;
    const cDb = getCompanyDb(company_id);
    cDb.run("DELETE FROM transactions WHERE id = ?", req.params.id, () => res.json({ success: true }));
});

// --- Joule Chat API ---

app.post('/api/chat', async (req, res) => {
    const { company_id, user_id, messages } = req.body;
    if (!company_id || !user_id) return res.status(400).json({ error: "Missing IDs" });
    try {
        const cDb = getCompanyDb(company_id);
        const summary = await getDatabaseSummary(company_id, user_id);
        cDb.get("SELECT users.full_name, user_settings.nickname FROM users LEFT JOIN user_settings ON users.id = user_settings.user_id WHERE users.id = ?", [user_id], async (err, row) => {
            let nickname = row?.nickname || (row?.full_name ? row.full_name.split(' ')[0] : "User");
            const dynamicContext = `\n\n### DYNAMIC USER CONTEXT:\nUser Name: ${nickname}\n${summary}\nServer Time: ${new Date().toISOString()}\nNOTE: Use provided search results if available. Do not repeat searches.`;
            let finalMessages = [...messages];
            let sysIdx = finalMessages.findIndex(m => m.role === 'system');
            if (sysIdx !== -1) finalMessages[sysIdx].content += dynamicContext;
            else finalMessages.unshift({ role: 'system', content: "You are Joule." + dynamicContext });

            const firstResp = await fetchFn("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.GROQ_API_KEY },
                body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: finalMessages, temperature: 0.2 })
            });
            const firstData = await firstResp.json();
            if (!firstResp.ok) return res.status(firstResp.status).json(firstData);
            
            const rawReply = firstData.choices[0].message.content;
            const secondResp = await fetchFn("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.GROQ_API_KEY },
                body: JSON.stringify({ 
                    model: "llama-3.1-8b-instant", 
                    messages: [{role: "system", content: `Refine text for human use. Keep user name and tone. Remove JSON from natural language. Preserve exactly "QUERY:{...}" or "ADD_TRANSACTION:{...}" tags at the end on new lines. If ONLY tags, return as is. RAW:\n${rawReply}`}],
                    temperature: 0
                })
            });
            const secondData = await secondResp.json();
            res.json(secondData);
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.use('/api', (err, req, res, next) => {
    console.error("[API Error]", err);
    res.status(err.status || 500).json({ error: err.message || "Unexpected error." });
});

app.listen(3000, () => console.log('Clarity Server running on Port 3000'));
