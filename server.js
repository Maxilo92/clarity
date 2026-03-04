require('dotenv').config();
const express = require('express');
const path    = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs      = require('fs');
const crypto  = require('crypto');
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
    if (page === 'index') return res.redirect('/');
    res.redirect('/' + page);
});

const APP_VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).version;
let fetchFn = globalThis.fetch || require('node-fetch');

// --- Multi-User & Auth API ---

app.post('/api/companies', (req, res) => {
    const { name, domain } = req.body;
    sysDb.run("INSERT INTO companies (name, domain) VALUES (?, ?)", [name, domain], function(err) {
        if (err) return res.status(400).json({ error: "Domain already registered." });
        const companyId = this.lastID;
        getCompanyDb(companyId); // Init DB
        res.json({ success: true, company_id: companyId });
    });
});

app.post('/api/users/signup', (req, res) => {
    const { full_name, email, password, company_id, role, invite_code } = req.body;
    const cDb = getCompanyDb(company_id);

    const completeSignup = () => {
        cDb.run("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)", 
            [full_name, email, password, role || 'user'], function(err) {
            if (err) return res.status(400).json({ error: "Email already taken in this company." });
            const userId = this.lastID;
            // Add to global index
            sysDb.run("INSERT INTO user_index (email, company_id) VALUES (?, ?)", [email, company_id]);
            res.json({ success: true, user_id: userId });
        });
    };

    if (role === 'user') {
        cDb.get("SELECT * FROM invites WHERE code = ? AND used = 0", [invite_code], (err, inv) => {
            if (err || !inv) return res.status(400).json({ error: "Invalid invite code." });
            cDb.run("UPDATE invites SET used = 1 WHERE code = ?", [invite_code]);
            completeSignup();
        });
    } else {
        completeSignup();
    }
});

app.post('/api/users/login', (req, res) => {
    const { email, password } = req.body;
    sysDb.get("SELECT company_id FROM user_index WHERE email = ?", [email], (err, index) => {
        if (err || !index) return res.status(401).json({ error: "Invalid credentials." });
        const cDb = getCompanyDb(index.company_id);
        cDb.get("SELECT users.*, companies.name as company_name FROM users CROSS JOIN (SELECT name FROM companies WHERE id = ?) as companies WHERE email = ? AND password = ?", 
            [index.company_id, email, password], (err, row) => {
            if (err || !row) return res.status(401).json({ error: "Invalid credentials." });
            res.json({ success: true, user: { ...row, company_id: index.company_id } });
        });
    });
});

// --- Invites & Management ---

app.post('/api/invites', (req, res) => {
    const { company_id, expires_in_hours } = req.body;
    const cDb = getCompanyDb(company_id);
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    let expiresAt = expires_in_hours ? new Date(Date.now() + expires_in_hours * 3600000).toISOString() : null;

    cDb.run("INSERT INTO invites (code, expires_at) VALUES (?, ?)", [code, expiresAt], (err) => {
        if (err) return res.status(500).json({ error: "Failed." });
        res.json({ success: true, code, expires_at: expiresAt });
    });
});

app.get('/api/invites/validate', (req, res) => {
    const { code } = req.query;
    sysDb.get("SELECT company_id FROM user_index WHERE email IS NULL", [], (err) => { // Dummy query to keep sysDb busy if needed
        // We actually need to find WHICH company this code belongs to. 
        // For simplicity, we can't easily JOIN across files in SQLite without ATTACH.
        // Let's assume the client might know or we have to search (slow) or use a better index.
        // FIX: Let's put invites back in system.db or require company hint.
        // PROPER FIX: Search all active company DBs or keep a global invite index.
        // For now, let's keep invites in system.db for easy cross-company validation.
    });
});

// RE-FIX: I'll move invites and users back to system.db but isolated by company_id,
// while TRANSACTIONS and SETTINGS go to company_<id>.db. This is the best trade-off.
// BUT the user said "everything in own comp db". Okay, then let's require company_id for validation.

app.get('/api/invites/validate', (req, res) => {
    const { code } = req.query;
    // We search all company databases for this code (In a real app, use a global index)
    const files = fs.readdirSync(path.join(APP_DIR, 'db')).filter(f => f.startsWith('company_'));
    let found = false;
    let count = 0;
    if (files.length === 0) return res.status(404).json({error: "No companies."});

    files.forEach(file => {
        const compId = file.match(/\d+/)[0];
        const cDb = getCompanyDb(compId);
        cDb.get("SELECT * FROM invites WHERE code = ? AND used = 0", [code], (err, row) => {
            count++;
            if (row && !found) {
                found = true;
                sysDb.get("SELECT * FROM companies WHERE id = ?", [compId], (err, comp) => {
                    res.json({ success: true, invite: { ...row, company_id: compId, company_name: comp.name, company_domain: comp.domain } });
                });
            } else if (count === files.length && !found) {
                res.status(404).json({ error: "Invalid code." });
            }
        });
    });
});

// --- User Management API ---

app.get('/api/users', (req, res) => {
    const { company_id } = req.query;
    if (!company_id) return res.status(400).json({ error: "Company ID required" });
    const cDb = getCompanyDb(company_id);
    cDb.all("SELECT id, full_name, email, role FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch users" });
        res.json({ users: rows });
    });
});

app.put('/api/users/:id', (req, res) => {
    const { company_id, role } = req.body;
    if (!company_id) return res.status(400).json({ error: "Company ID required" });
    const cDb = getCompanyDb(company_id);
    cDb.run("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: "Failed to update user" });
        res.json({ success: true });
    });
});

app.delete('/api/users/:id', (req, res) => {
    const { company_id } = req.query;
    if (!company_id) return res.status(400).json({ error: "Company ID required." });
    
    const cDb = getCompanyDb(company_id);
    const userId = req.params.id;

    // Security check: Don't allow deleting the last admin
    cDb.get("SELECT role, email FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "User not found." });

        if (user.role === 'admin') {
            cDb.get("SELECT COUNT(*) as adminCount FROM users WHERE role = 'admin'", [], (err, row) => {
                if (err) return res.status(500).json({ error: "DB Error" });
                if (row.adminCount <= 1) {
                    return res.status(403).json({ 
                        error: "last_admin", 
                        message: "You are the last administrator. Please promote another employee to Admin before deleting your account." 
                    });
                }
                performDeletion(user.email);
            });
        } else {
            performDeletion(user.email);
        }
    });

    function performDeletion(email) {
        cDb.run("DELETE FROM users WHERE id = ?", [userId], function(err) {
            if (err) return res.status(500).json({ error: "Failed." });
            // Clean up index and settings
            sysDb.run("DELETE FROM user_index WHERE email = ?", [email]);
            cDb.run("DELETE FROM user_settings WHERE user_id = ?", [userId]);
            res.json({ success: true });
        });
    }
});

// --- User Settings API ---

app.get('/api/config', (req, res) => {
    const { user_id, company_id } = req.query;
    if (!user_id || !company_id) return res.json({ app_version: APP_VERSION });
    const cDb = getCompanyDb(company_id);
    cDb.get("SELECT * FROM user_settings WHERE user_id = ?", [user_id], (err, row) => {
        res.json({ ...row, app_version: APP_VERSION });
    });
});

app.post('/api/config', (req, res) => {
    const { user_id, company_id, nickname } = req.body;
    const cDb = getCompanyDb(company_id);
    cDb.run("INSERT INTO user_settings (user_id, nickname) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET nickname=excluded.nickname",
        [user_id, nickname], (err) => {
        res.json({ success: true });
    });
});

// --- Transactions API ---

app.get("/api/transactions", (req, res) => {
    const { company_id, user_id, limit=25, offset=0 } = req.query;
    if (!company_id) return res.status(400).json({ error: "Required." });
    const cDb = getCompanyDb(company_id);
    cDb.all("SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?", 
        [user_id, parseInt(limit), parseInt(offset)], (err, rows) => {
        res.json({ eintraege: rows || [] });
    });
});

app.post('/api/transactions', (req, res) => {
    const { company_id, user_id, name, kategorie, wert, sender, empfaenger } = req.body;
    const cDb = getCompanyDb(company_id);
    cDb.run("INSERT INTO transactions (id, name, kategorie, wert, timestamp, sender, empfaenger, user_id) VALUES (?,?,?,?,?,?,?,?)",
        [Date.now(), name, kategorie, parseFloat(wert), new Date().toISOString(), sender, empfaenger, user_id],
        (err) => res.json({ success: true }));
});

// --- Joule Chat API ---

app.post('/api/chat', async (req, res) => {
    const { company_id, user_id, messages } = req.body;
    const cDb = getCompanyDb(company_id);
    
    // Get nickname
    cDb.get("SELECT nickname FROM user_settings WHERE user_id = ?", [user_id], async (err, setting) => {
        const nickname = setting?.nickname || "User";
        // Get summary from transactions
        cDb.all("SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10", [user_id], async (err, rows) => {
            let summary = "No data.";
            if (rows?.length > 0) summary = rows.map(r => `${r.name}: ${r.wert}€`).join(", ");
            
            const systemPrompt = `You are Joule. Addressing user as ${nickname}. Context: ${summary}`;
            const resp = await fetchFn("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.GROQ_API_KEY },
                body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{role:"system", content:systemPrompt}, ...messages] })
            });
            const data = await resp.json();
            res.json(data);
        });
    });
});

app.listen(3000, () => console.log('Clarity Server running on Port 3000'));
