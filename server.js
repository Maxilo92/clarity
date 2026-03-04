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
            // We only show transactions belonging to THIS user for their Joule context
            cDb.all("SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC", [userId], (err, rows) => {
                if (err || !rows || rows.length === 0) return resolve("No transaction data available for this user.");
                let totalIn = 0, totalOut = 0;
                const cats = {};
                
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

                let s = "### YOUR FINANCIAL ANALYTICS (CONFIDENTIAL) ###\n";
                s += `Current Month (${currentMonthStr}): +${currentMonthIn.toFixed(2)}€ | -${currentMonthOut.toFixed(2)}€ | Surplus: ${(currentMonthIn - currentMonthOut).toFixed(2)}€\n`;
                s += `Your Total Balance: ${(totalIn - totalOut).toFixed(2)}€\n\n`;
                
                s += "### RECENT 5 TRANSACTIONS ###\n";
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

// --- Multi-User Onboarding & Auth API ---

app.post('/api/onboarding/admin', async (req, res) => {
    const { company_name, domain, full_name, email, password } = req.body;

    if (!company_name || !domain || !full_name || !email || !password) {
        return res.status(400).json({ error: "All fields are required." });
    }

    // 1. Check if email is globally indexed
    sysDb.get("SELECT email FROM user_index WHERE email = ?", [email], async (err, indexed) => {
        if (indexed) return res.status(400).json({ error: "A user with this email already exists." });

        // 2. Create Company
        sysDb.run("INSERT INTO companies (name, domain) VALUES (?, ?)", [company_name, domain], async function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: "This company domain is already registered." });
                }
                return res.status(500).json({ error: "Failed to create company directory." });
            }

            const companyId = this.lastID;
            const cDb = getCompanyDb(companyId);

            try {
                const hashedPassword = await bcrypt.hash(password, 10);

                // 3. Create Admin User in Company DB
                cDb.run("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)", 
                    [full_name, email, hashedPassword, 'admin'], function(err) {

                    if (err) {
                        // Rollback company if user fails
                        sysDb.run("DELETE FROM companies WHERE id = ?", [companyId]);
                        return res.status(500).json({ error: "User creation failed within company." });
                    }

                    const userId = this.lastID;

                    // 4. Index the user globally
                    sysDb.run("INSERT INTO user_index (email, company_id) VALUES (?, ?)", [email, companyId], (err) => {
                        if (err) {
                            // Rollback user and company
                            cDb.run("DELETE FROM users WHERE id = ?", [userId]);
                            sysDb.run("DELETE FROM companies WHERE id = ?", [companyId]);
                            return res.status(500).json({ error: "Final indexing failed." });
                        }
                        res.json({ success: true, company_id: companyId, user_id: userId });
                    });
                });
            } catch (e) {
                sysDb.run("DELETE FROM companies WHERE id = ?", [companyId]);
                res.status(500).json({ error: "Security processing failed." });
            }
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
                if (err) return res.status(400).json({ error: "Email already taken in this company." });
                const userId = this.lastID;
                sysDb.run("INSERT INTO user_index (email, company_id) VALUES (?, ?)", [email, company_id], (err) => {
                    if (err) return res.status(500).json({ error: "Indexing failed." });
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
        } else {
            completeSignup();
        }
    } catch (e) { res.status(500).json({ error: "Hashing failed." }); }
});

app.post('/api/users/login', (req, res) => {
    const { email, password } = req.body;
    sysDb.get("SELECT company_id FROM user_index WHERE email = ?", [email], (err, index) => {
        if (err || !index) return res.status(401).json({ error: "Invalid credentials." });
        
        const cDb = getCompanyDb(index.company_id);
        cDb.get("SELECT * FROM users WHERE email = ?", [email], async (err, row) => {
            if (err || !row) return res.status(401).json({ error: "Invalid credentials." });
            
            const match = await bcrypt.compare(password, row.password);
            if (!match) return res.status(401).json({ error: "Invalid credentials." });
            
            sysDb.get("SELECT name FROM companies WHERE id = ?", [index.company_id], (err, comp) => {
                res.json({ 
                    success: true, 
                    user: { 
                        id: row.id, 
                        full_name: row.full_name, 
                        email: row.email, 
                        role: row.role, 
                        company_id: index.company_id,
                        company_name: comp ? comp.name : "Organization"
                    } 
                });
            });
        });
    });
});

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

app.get('/api/invites', (req, res) => {
    const { company_id } = req.query;
    const cDb = getCompanyDb(company_id);
    cDb.all("SELECT * FROM invites ORDER BY id DESC", [], (err, rows) => {
        res.json({ invites: rows || [] });
    });
});

app.post('/api/invites/cancel', (req, res) => {
    const { code, company_id } = req.body;
    const cDb = getCompanyDb(company_id);
    cDb.run("UPDATE invites SET used = 1 WHERE code = ?", [code], (err) => res.json({ success: true }));
});

app.get('/api/invites/validate', (req, res) => {
    const { code } = req.query;
    const dbDir = path.join(APP_DIR, 'db');
    const files = fs.readdirSync(dbDir).filter(f => f.startsWith('company_'));
    let processed = 0;
    let found = false;

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
            } else if (processed === files.length && !found) {
                res.status(404).json({ error: "Invalid invite code." });
            }
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
    cDb.run("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id], () => res.json({ success: true }));
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
                deleteUser(user.email);
            });
        } else { deleteUser(user.email); }
    });

    function deleteUser(email) {
        cDb.run("DELETE FROM users WHERE id = ?", [userId], () => {
            sysDb.run("DELETE FROM user_index WHERE email = ?", [email]);
            cDb.run("DELETE FROM user_settings WHERE user_id = ?", [userId]);
            res.json({ success: true });
        });
    }
});

app.get('/api/config', (req, res) => {
    const { user_id, company_id } = req.query;
    if (!user_id || !company_id) return res.json({ app_version: APP_VERSION });
    const cDb = getCompanyDb(company_id);
    cDb.get("SELECT * FROM user_settings WHERE user_id = ?", [user_id], (err, row) => res.json({ ...row, app_version: APP_VERSION }));
});

app.post('/api/config', (req, res) => {
    const { user_id, company_id, nickname } = req.body;
    const cDb = getCompanyDb(company_id);
    cDb.run("INSERT INTO user_settings (user_id, nickname) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET nickname=excluded.nickname",
        [user_id, nickname], () => res.json({ success: true }));
});

app.get("/api/transactions", (req, res) => {
    const { company_id, user_id, limit=25, offset=0 } = req.query;
    const cDb = getCompanyDb(company_id);
    cDb.all("SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?", 
        [user_id, parseInt(limit), parseInt(offset)], (err, rows) => res.json({ eintraege: rows || [] }));
});

app.post('/api/transactions', (req, res) => {
    const { company_id, user_id, name, kategorie, wert, sender, empfaenger } = req.body;
    const cDb = getCompanyDb(company_id);
    cDb.run("INSERT INTO transactions (id, name, kategorie, wert, timestamp, sender, empfaenger, user_id) VALUES (?,?,?,?,?,?,?,?)",
        [Date.now(), name, kategorie, parseFloat(wert), new Date().toISOString(), sender, empfaenger, user_id],
        () => res.json({ success: true }));
});

app.post('/api/chat', async (req, res) => {
    const { company_id, user_id, messages } = req.body;
    
    if (!company_id || !user_id) {
        return res.status(400).json({ error: "Missing company_id or user_id in chat request." });
    }

    try {
        const cDb = getCompanyDb(company_id);
        const summary = await getDatabaseSummary(company_id, user_id);
        
        cDb.get("SELECT users.full_name, user_settings.nickname FROM users LEFT JOIN user_settings ON users.id = user_settings.user_id WHERE users.id = ?", [user_id], async (err, row) => {
            if (err) return res.status(500).json({ error: "User lookup failed." });
            
            // Default nickname is first name from full_name
            let nickname = "User";
            if (row) {
                if (row.nickname) {
                    nickname = row.nickname;
                } else if (row.full_name) {
                    nickname = row.full_name.split(' ')[0];
                }
            }

            const systemPrompt = `You are Joule, an intelligent financial advisor for "Clarity". 
Addressing user as ${nickname}. 

SECURITY: You are strictly isolated to the data of the current user.
${summary}

Keep it professional and helpful.`;

            try {
                const resp = await fetchFn("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.GROQ_API_KEY },
                    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{role:"system", content:systemPrompt}, ...messages] })
                });
                const data = await resp.json();
                res.json(data);
            } catch (fetchErr) {
                console.error("Groq API error:", fetchErr);
                res.status(500).json({ error: "AI service communication failed." });
            }
        });
    } catch(e) {
        console.error("Chat route error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(3000, () => console.log('Clarity Server running on Port 3000'));
