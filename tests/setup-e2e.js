const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const APP_DIR = path.join(__dirname, '..', 'App');
const SYS_DB_PATH = path.join(APP_DIR, 'db', 'system.db');
const COMP_DB_PATH = path.join(APP_DIR, 'db', 'company_1.db');

async function setup() {
    console.log('--- Setting up E2E Test Data ---');
    
    const sysDb = new sqlite3.Database(SYS_DB_PATH);
    const compDb = new sqlite3.Database(COMP_DB_PATH);

    const email = 'e2e@clarity.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    return new Promise((resolve, reject) => {
        sysDb.serialize(() => {
            // Ensure system tables exist (fallback if not created by app yet)
            sysDb.run(`CREATE TABLE IF NOT EXISTS companies (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, domain TEXT UNIQUE NOT NULL)`);
            sysDb.run(`CREATE TABLE IF NOT EXISTS user_index (email TEXT PRIMARY KEY, company_id INTEGER)`);

            // Add Company 1 if not exists
            sysDb.run(`INSERT OR IGNORE INTO companies (id, name, domain) VALUES (1, 'E2E Corp', 'e2e-corp.com')`);
            
            // Add User to Index
            sysDb.run(`INSERT OR REPLACE INTO user_index (email, company_id) VALUES (?, 1)`, [email]);
        });

        compDb.serialize(() => {
            // Ensure company tables exist
            compDb.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'user', must_change_password INTEGER DEFAULT 0)`);
            
            // Add Admin User
            compDb.run(`INSERT OR REPLACE INTO users (id, full_name, email, password, role, must_change_password) VALUES (999, 'E2E Admin', ?, ?, 'admin', 0)`, 
                [email, hashedPassword], (err) => {
                if (err) reject(err);
                else {
                    console.log(`[OK] E2E User created: ${email}`);
                    sysDb.close();
                    compDb.close();
                    resolve();
                }
            });
        });
    });
}

setup().catch(err => {
    console.error('Setup failed:', err);
    process.exit(1);
});
