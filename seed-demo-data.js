/**
 * Clarity Demo Data Seed Script
 * Generates realistic, diverse financial transactions.
 * Supports different scenarios for sales/demos.
 *
 * Run: node seed-demo-data.js [--scenario=startup|kmu|agentur|personal] [--reset] [--company=1]
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// ─── Parse Arguments ─────────────────────────────────────
const args = process.argv.slice(2);
let scenario = 'personal';
let reset = false;
let companyId = 1;

args.forEach(arg => {
    if (arg.startsWith('--scenario=')) scenario = arg.split('=')[1].toLowerCase();
    if (arg === '--reset') reset = true;
    if (arg.startsWith('--company=')) companyId = parseInt(arg.split('=')[1], 10);
});

if (!['personal', 'startup', 'kmu', 'agentur'].includes(scenario)) {
    console.error(`Unknown scenario: ${scenario}. Using 'personal'.`);
    scenario = 'personal';
}

const DB_PATH = path.join(__dirname, 'App', 'db', `company_${companyId}.db`);
if (!fs.existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}. Please run the app to initialize it first.`);
    process.exit(1);
}
const db = new sqlite3.Database(DB_PATH);

// ─── Users ───────────────────────────────────────────
const USERS = [
    { id: 1, name: 'Company User' }
];

// ─── Scenarios ───────────────────────────────────────────
const SCENARIOS = {
    personal: {
        total_transactions: 2500,
        distribution: { Food: 950, Housing: 200, Transportation: 350, Leisure: 350, Shopping: 400, Health: 100, Income: 50, Miscellaneous: 100 },
        categories: {
            Food: [ 
                { name: 'REWE Wocheneinkauf', empfaenger: 'REWE', beschreibung: 'Lebensmittel für die Woche', wert: [-120, -35] },
                { name: 'ALDI Einkauf', empfaenger: 'ALDI Süd', beschreibung: 'Grundnahrungsmittel und Snacks', wert: [-85, -18] },
                { name: 'EDEKA Markt', empfaenger: 'EDEKA', beschreibung: 'Frische Einkäufe', wert: [-95, -25] },
                { name: 'Lidl Einkauf', empfaenger: 'Lidl', beschreibung: 'Wocheneinkauf Discounter', wert: [-70, -20] },
                { name: 'Restaurant Il Palazzo', empfaenger: 'Il Palazzo', beschreibung: 'Italienisches Abendessen', wert: [-85, -22] },
                { name: 'Lieferando Bestellung', empfaenger: 'Lieferando', beschreibung: 'Essenslieferung nach Hause', wert: [-45, -12] },
                { name: 'Bäckerei Müller', empfaenger: 'Bäckerei Müller', beschreibung: 'Brötchen und Kaffee', wert: [-15, -3] },
                { name: 'Starbucks Coffee', empfaenger: 'Starbucks', beschreibung: 'Kaffee-Spezialität', wert: [-9, -5] },
                { name: 'McDonalds Menü', empfaenger: 'McDonalds', beschreibung: 'Fast Food', wert: [-14, -8] },
                { name: 'Sushi-Abend', empfaenger: 'Oishii Sushi', beschreibung: 'Dinner mit Freunden', wert: [-60, -30] },
                { name: 'Vapiano Lunch', empfaenger: 'Vapiano', beschreibung: 'Mittagessen', wert: [-18, -12] },
                { name: 'Wochenmarkt', empfaenger: 'Marktstand', beschreibung: 'Obst und Gemüse', wert: [-35, -10] }
            ],
            Housing: [ 
                { name: 'Miete', empfaenger: 'Hausverwaltung Schmidt', beschreibung: 'Monatliche Kaltmiete', wert: [-1400, -750] },
                { name: 'Nebenkosten', empfaenger: 'Hausverwaltung Schmidt', beschreibung: 'Vorauszahlung', wert: [-300, -150] },
                { name: 'Stromabschlag', empfaenger: 'Stadtwerke', beschreibung: 'Monatlicher Strom', wert: [-110, -55] },
                { name: 'Gasrechnung', empfaenger: 'Stadtwerke', beschreibung: 'Heizkosten', wert: [-140, -70] },
                { name: 'Internetanschluss', empfaenger: 'Telekom', beschreibung: 'Glasfaser 250', wert: [-55, -35] },
                { name: 'IKEA Möbel', empfaenger: 'IKEA', beschreibung: 'Einrichtung und Deko', wert: [-450, -45] },
                { name: 'GEZ Beitrag', empfaenger: 'Beitragsservice', beschreibung: 'Rundfunkgebühren', wert: [-55, -55] },
                { name: 'Baumarkt Einkauf', empfaenger: 'OBI', beschreibung: 'Renovierungsmaterial', wert: [-120, -25] },
                { name: 'Müllgebühren', empfaenger: 'Stadtkasse', beschreibung: 'Abfallentsorgung', wert: [-45, -45] }
            ],
            Transportation: [ 
                { name: 'Tankstelle Shell', empfaenger: 'Shell', beschreibung: 'Super E10 tanken', wert: [-95, -45] },
                { name: 'Tankstelle Aral', empfaenger: 'Aral', beschreibung: 'Diesel tanken', wert: [-105, -55] },
                { name: 'Deutschlandticket', empfaenger: 'Deutsche Bahn', beschreibung: 'Monatsabo ÖPNV', wert: [-49, -49] },
                { name: 'KFZ-Versicherung', empfaenger: 'HUK-COBURG', beschreibung: 'Versicherungsbeitrag', wert: [-120, -45] },
                { name: 'Uber Fahrt', empfaenger: 'Uber', beschreibung: 'Fahrt zum Bahnhof', wert: [-35, -12] },
                { name: 'Parkhaus City', empfaenger: 'Apcoa', beschreibung: 'Parkgebühren', wert: [-25, -5] },
                { name: 'KFZ Steuer', empfaenger: 'Hauptzollamt', beschreibung: 'Jährliche Steuer', wert: [-180, -180] },
                { name: 'Autowäsche', empfaenger: 'Mr. Wash', beschreibung: 'Innen- und Außenreinigung', wert: [-35, -15] },
                { name: 'DB Fernverkehr', empfaenger: 'Deutsche Bahn', beschreibung: 'ICE Ticket', wert: [-120, -40] },
                { name: 'E-Scooter Lime', empfaenger: 'Lime', beschreibung: 'Miete Roller', wert: [-8, -3] }
            ],
            Leisure: [ 
                { name: 'Netflix Abo', empfaenger: 'Netflix', beschreibung: 'Streaming Premium', wert: [-18, -18] },
                { name: 'Spotify Premium', empfaenger: 'Spotify', beschreibung: 'Music Family', wert: [-15, -15] },
                { name: 'Kino CinemaxX', empfaenger: 'CinemaxX', beschreibung: '2 Tickets + Snacks', wert: [-45, -20] },
                { name: 'Fitnessstudio', empfaenger: 'FitX', beschreibung: 'Monatlicher Beitrag', wert: [-25, -25] },
                { name: 'Amazon Prime', empfaenger: 'Amazon', beschreibung: 'Jahresabo', wert: [-89, -89] },
                { name: 'YouTube Premium', empfaenger: 'Google', beschreibung: 'Streaming Abo', wert: [-13, -13] },
                { name: 'Konzertticket', empfaenger: 'Eventim', beschreibung: 'Live Event', wert: [-150, -60] },
                { name: 'Staatstheater', empfaenger: 'Oper', beschreibung: 'Kulturabend', wert: [-80, -40] },
                { name: 'Club-Besuch', empfaenger: 'Harry Klein', beschreibung: 'Eintritt und Drinks', wert: [-50, -25] },
                { name: 'Fußball-Stadion', empfaenger: 'FC Bayern', beschreibung: 'Ticket und Verpflegung', wert: [-70, -45] }
            ],
            Shopping: [ 
                { name: 'Amazon Bestellung', empfaenger: 'Amazon', beschreibung: 'Haushaltswaren', wert: [-150, -15] },
                { name: 'Zalando Mode', empfaenger: 'Zalando', beschreibung: 'Schuhe und Jacke', wert: [-250, -45] },
                { name: 'MediaMarkt', empfaenger: 'MediaMarkt', beschreibung: 'Technik-Zubehör', wert: [-350, -20] },
                { name: 'dm Drogerie', empfaenger: 'dm', beschreibung: 'Pflegeprodukte', wert: [-45, -10] },
                { name: 'Apple Store', empfaenger: 'Apple', beschreibung: 'Zubehör / Apps', wert: [-120, -15] },
                { name: 'ZARA Shopping', empfaenger: 'ZARA', beschreibung: 'Neue Kleidung', wert: [-180, -40] },
                { name: 'H&M Einkauf', empfaenger: 'H&M', beschreibung: 'Basics', wert: [-80, -25] },
                { name: 'Saturn Technik', empfaenger: 'Saturn', beschreibung: 'Gadgets', wert: [-150, -30] },
                { name: 'Douglas Parfümerie', empfaenger: 'Douglas', beschreibung: 'Geschenk', wert: [-90, -40] },
                { name: 'IKEA Shopping', empfaenger: 'IKEA', beschreibung: 'Küchenartikel', wert: [-120, -20] }
            ],
            Health: [ 
                { name: 'Apotheke', empfaenger: 'Stadt-Apotheke', beschreibung: 'Medikamente', wert: [-45, -8] },
                { name: 'Zahnarzt', empfaenger: 'Dr. Weiss', beschreibung: 'Zahnreinigung', wert: [-120, -80] },
                { name: 'Krankenversicherung', empfaenger: 'TK', beschreibung: 'Zusatzbeitrag', wert: [-280, -80] },
                { name: 'Augenoptiker', empfaenger: 'Fielmann', beschreibung: 'Neue Kontaktlinsen', wert: [-60, -30] },
                { name: 'Fitness-Supplemente', empfaenger: 'MyProtein', beschreibung: 'Protein und Vitamine', wert: [-80, -40] },
                { name: 'Massage', empfaenger: 'Physio-Praxis', beschreibung: 'Behandlung', wert: [-75, -45] }
            ],
            Income: [ 
                { name: 'Gehaltszahlung', sender: 'SAP SE', beschreibung: 'Monatsgehalt Netto', wert: [5500, 3200] },
                { name: 'Bonus Q1', sender: 'SAP SE', beschreibung: 'Performance Bonus', wert: [4500, 1500] },
                { name: 'Dividende Allianz', sender: 'Trade Republic', beschreibung: 'Ausschüttung', wert: [250, 45] },
                { name: 'Zinsgutschrift', sender: 'ING', beschreibung: 'Tagesgeldzinsen', wert: [85, 12] },
                { name: 'eBay Verkauf', sender: 'Kleinanzeigen', beschreibung: 'Verkauf alte Kamera', wert: [450, 120] },
                { name: 'Steuererstattung', sender: 'Finanzamt', beschreibung: 'Einkommensteuer', wert: [2200, 400] },
                { name: 'Mieteinnahme', sender: 'Untermieter', beschreibung: 'WG-Zimmer', wert: [650, 650] }
            ],
            Miscellaneous: [ 
                { name: 'Haftpflichtversicherung', empfaenger: 'Allianz', beschreibung: 'Jahresbeitrag', wert: [-95, -65] },
                { name: 'Spende Rotes Kreuz', empfaenger: 'DRK', beschreibung: 'Monatliche Hilfe', wert: [-50, -10] },
                { name: 'Friseurbesuch', empfaenger: 'Haarschnitt GmbH', beschreibung: 'Waschen und Schneiden', wert: [-65, -35] },
                { name: 'Reinigung', empfaenger: 'Textilreinigung', beschreibung: 'Anzüge reinigen', wert: [-45, -20] },
                { name: 'Postgebühren', empfaenger: 'DHL', beschreibung: 'Paketversand', wert: [-15, -5] },
                { name: 'Bankgebühren', empfaenger: 'Sparkasse', beschreibung: 'Kontoführung', wert: [-12, -8] }
            ]
        }
    },
    startup: {
        total_transactions: 1500,
        distribution: { Operations: 350, Marketing: 350, Payroll: 200, Software: 400, Income: 200 },
        categories: {
            Operations: [ 
                { name: 'WeWork Office', empfaenger: 'WeWork', beschreibung: 'Berlin HQ', wert: [-4500, -2500] },
                { name: 'Legal Counsel', empfaenger: 'Freshfields', beschreibung: 'Contract Review', wert: [-3500, -1500] },
                { name: 'Tax Advisor', empfaenger: 'KPMG', beschreibung: 'Tax Declaration', wert: [-2500, -800] },
                { name: 'Office Supplies', empfaenger: 'Staples', beschreibung: 'Furniture & Hardware', wert: [-800, -200] }
            ],
            Marketing: [ 
                { name: 'Google Ads', empfaenger: 'Google', beschreibung: 'Search Campaigns', wert: [-8000, -1500] },
                { name: 'Meta Ads', empfaenger: 'Facebook', beschreibung: 'Social Media Marketing', wert: [-5000, -1000] },
                { name: 'LinkedIn Ads', empfaenger: 'LinkedIn', beschreibung: 'B2B Lead Gen', wert: [-4000, -800] },
                { name: 'Podcast Sponsoring', empfaenger: 'OMR', beschreibung: 'Ad Slot', wert: [-6000, -2500] }
            ],
            Payroll: [ 
                { name: 'Salary Founder', empfaenger: 'CEO', beschreibung: 'Founder Salary', wert: [-5000, -4500] },
                { name: 'Salary Dev Team', empfaenger: 'Engineering', beschreibung: 'Payroll Month', wert: [-15000, -8000] },
                { name: 'Freelance Design', empfaenger: 'Designer', beschreibung: 'UI/UX Project', wert: [-4000, -1500] }
            ],
            Software: [ 
                { name: 'AWS Cloud', empfaenger: 'Amazon Web Services', beschreibung: 'Infrastructure', wert: [-2500, -800] },
                { name: 'GitHub Enterprise', empfaenger: 'GitHub', beschreibung: 'CI/CD & Repo', wert: [-250, -250] },
                { name: 'Slack Pro', empfaenger: 'Slack', beschreibung: 'Team Communication', wert: [-180, -180] },
                { name: 'Notion Plus', empfaenger: 'Notion', beschreibung: 'Docs & Wiki', wert: [-120, -120] },
                { name: 'Sentry.io', empfaenger: 'Sentry', beschreibung: 'Error Tracking', wert: [-90, -90] }
            ],
            Income: [ 
                { name: 'VC Funding', sender: 'Sequoia', beschreibung: 'Series A Round', wert: [500000, 200000] },
                { name: 'Stripe Payout', sender: 'Stripe', beschreibung: 'SaaS MRR', wert: [15000, 5000] },
                { name: 'App Store Proceeds', sender: 'Apple', beschreibung: 'Sales Q1', wert: [8000, 2500] }
            ]
        }
    },
    agentur: {
        total_transactions: 1200,
        distribution: { Software: 250, Payroll: 200, Marketing: 150, Office: 150, Income: 100 },
        categories: {
            Software: [
                { name: 'Adobe Creative Cloud', empfaenger: 'Adobe', beschreibung: 'Team License', wert: [-1200, -450] },
                { name: 'Figma Professional', empfaenger: 'Figma', beschreibung: 'Design Seats', wert: [-450, -150] },
                { name: 'Slack Enterprise', empfaenger: 'Slack', beschreibung: 'Communication', wert: [-300, -120] },
                { name: 'Google Workspace', empfaenger: 'Google', beschreibung: 'Email & Drive', wert: [-150, -80] },
                { name: 'Zoom Pro', empfaenger: 'Zoom', beschreibung: 'Video Calls', wert: [-120, -60] }
            ],
            Payroll: [
                { name: 'Gehaltslauf Monat', empfaenger: 'Mitarbeiter', beschreibung: 'Full-time Staff', wert: [-35000, -15000] },
                { name: 'Freelance Design', empfaenger: 'Creative Studio', beschreibung: 'External Support', wert: [-5000, -1200] },
                { name: 'Freelance Dev', empfaenger: 'Code Ninja', beschreibung: 'Backend Project', wert: [-8000, -2500] }
            ],
            Marketing: [
                { name: 'Instagram Campaign', empfaenger: 'Meta', beschreibung: 'Recruiting', wert: [-1200, -400] },
                { name: 'Google Search Ads', empfaenger: 'Google', beschreibung: 'Lead Gen', wert: [-2500, -800] },
                { name: 'Award Entry', empfaenger: 'Red Dot', beschreibung: 'Submission Fee', wert: [-800, -350] }
            ],
            Office: [
                { name: 'Atelier Miete', empfaenger: 'Immobilien KG', beschreibung: 'Loft Office', wert: [-4500, -2800] },
                { name: 'Catering Meeting', empfaenger: 'Local Bistro', beschreibung: 'Client Workshop', wert: [-450, -120] },
                { name: 'Reinigungsservice', empfaenger: 'Clean Team', beschreibung: 'Weekly cleaning', wert: [-350, -200] }
            ],
            Income: [
                { name: 'Projekt Relaunch', sender: 'Großkunde AG', beschreibung: 'Final Payment', wert: [45000, 15000] },
                { name: 'Retainer Monthly', sender: 'Brand Partner', beschreibung: 'Service Fee', wert: [12000, 4500] },
                { name: 'Workshop Fee', sender: 'Tech Corp', beschreibung: 'Strategy Session', wert: [3500, 1200] }
            ]
        }
    },
    kmu: {
        total_transactions: 1800,
        distribution: { Operations: 450, Logistics: 400, Payroll: 300, Supplies: 450, Income: 200 },
        categories: {
            Operations: [ 
                { name: 'Gewerbemiete', empfaenger: 'Immo Management', beschreibung: 'Lager & Büro', wert: [-6500, -3500] },
                { name: 'Strom & Energie', empfaenger: 'Stadtwerke', beschreibung: 'Industrie-Tarif', wert: [-1200, -600] },
                { name: 'Versicherung', empfaenger: 'Allianz Business', beschreibung: 'Betriebshaftpflicht', wert: [-800, -400] }
            ],
            Logistics: [ 
                { name: 'DHL Express', empfaenger: 'DHL', beschreibung: 'Paketversand Inland', wert: [-1200, -400] },
                { name: 'Spedition Meyer', empfaenger: 'Logistik AG', beschreibung: 'Palettenversand', wert: [-3500, -1500] },
                { name: 'Fuhrpark Leasing', empfaenger: 'VW Leasing', beschreibung: 'Firmenwagen', wert: [-2500, -1200] },
                { name: 'Tankkarten', empfaenger: 'Shell Fleet', beschreibung: 'Flotten-Tanken', wert: [-800, -350] }
            ],
            Payroll: [ 
                { name: 'Gehaltslauf', empfaenger: 'Mitarbeiter', beschreibung: 'Löhne & Gehälter', wert: [-25000, -12000] },
                { name: 'Sozialabgaben', empfaenger: 'Krankenkassen', beschreibung: 'Beiträge', wert: [-8000, -4000] }
            ],
            Supplies: [ 
                { name: 'Wareneinkauf', empfaenger: 'Großhandel', beschreibung: 'Rohmaterial', wert: [-15000, -5000] },
                { name: 'Verpackungsmaterial', empfaenger: 'Ratioform', beschreibung: 'Kartons & Klebeband', wert: [-800, -250] },
                { name: 'Büromaterial', empfaenger: 'Staples Business', beschreibung: 'Papier & Toner', wert: [-350, -80] }
            ],
            Income: [ 
                { name: 'Kundenzahlung', sender: 'Kunde GmbH', beschreibung: 'Rechnungsnummer #2026', wert: [12000, 2500] },
                { name: 'Barumsatz', sender: 'Ladenkasse', beschreibung: 'Tagesumsatz Shop', wert: [3500, 800] },
                { name: 'Großauftrag', sender: 'Konzern AG', beschreibung: 'Projekt Phase 1', wert: [45000, 15000] }
            ]
        }
    }
};

// ─── Helper Functions ────────────────────────────────────

function randomBetween(min, max) { return Math.random() * (max - min) + min; }
function randomInt(min, max) { return Math.floor(randomBetween(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function roundTo2(n) { return Math.round(n * 100) / 100; }

function randomTimestamp(startDate, endDate) {
    const start = startDate.getTime();
    const end = endDate.getTime();
    const r = Math.pow(Math.random(), 0.85);
    const ts = start + r * (end - start);
    const d = new Date(ts);
    d.setHours(randomInt(6, 22), randomInt(0, 59), randomInt(0, 59));
    return d.toISOString();
}

function generateTransactions() {
    const conf = SCENARIOS[scenario];
    let allTransactions = [];
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    const endDate = new Date('2026-03-05T23:59:59.000Z');

    for (const [category, count] of Object.entries(conf.distribution)) {
        const templates = conf.categories[category];
        if (!templates) continue;

        for (let i = 0; i < count; i++) {
            const tpl = pick(templates);
            const user = pick(USERS);
            const [minWert, maxWert] = tpl.wert;
            const wert = roundTo2(randomBetween(minWert, maxWert));
            const timestamp = randomTimestamp(startDate, endDate);
            
            const isIncome = category === 'Income';
            const sender = isIncome ? (tpl.sender || 'Unbekannt') : user.name;
            const empfaenger = isIncome ? user.name : (tpl.empfaenger || 'Unbekannt');

            allTransactions.push({
                id: null,
                name: tpl.name,
                kategorie: category,
                wert: wert,
                timestamp: timestamp,
                sender: sender,
                empfaenger: empfaenger,
                user_id: user.id,
                beschreibung: tpl.beschreibung
            });
        }
    }

    allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const BASE_ID = 1800000000000;
    allTransactions.forEach((t, idx) => { t.id = BASE_ID + idx; });
    return allTransactions;
}

// ─── Main ────────────────────────────────────────────────

async function main() {
    console.log(`\n🏦 Clarity Demo Data Seeder`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Scenario: ${scenario.toUpperCase()}`);
    console.log(`Company ID: ${companyId}`);
    console.log(`Database: ${DB_PATH}\n`);

    const scenarioConf = SCENARIOS[scenario];

    db.serialize(() => {
        if (reset) {
            console.log('🧹 Resetting transactions table...');
            db.run('DELETE FROM transactions', (err) => {
                if (err) console.error("Error clearing transactions:", err);
            });
        }

        // Ensure all scenario categories exist in the categories table
        console.log('📁 Ensuring categories exist...');
        const catNames = Object.keys(scenarioConf.distribution);
        const catStmt = db.prepare("INSERT OR IGNORE INTO categories (name, color, icon, is_default) VALUES (?, ?, ?, 0)");
        
        const scenarioColors = {
            Software: '#3498db', Payroll: '#f1c40f', Marketing: '#e67e22', Operations: '#16a085',
            Logistics: '#7f8c8d', Supplies: '#9b59b6', Freelancer: '#2980b9', Travel: '#e74c3c', Office: '#27ae60'
        };

        catNames.forEach(name => {
            if (name === 'Income') return;
            const color = scenarioColors[name] || '#6f42c1';
            catStmt.run(name, color, 'tag');
        });
        catStmt.finalize();

        const txns = generateTransactions();
        
        console.log('Inserting into database...');
        const stmt = db.prepare(`INSERT INTO transactions (id, name, kategorie, wert, timestamp, sender, empfaenger, user_id, beschreibung) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        db.run('BEGIN TRANSACTION');
        txns.forEach(t => {
            stmt.run(t.id, t.name, t.kategorie, t.wert, t.timestamp, t.sender, t.empfaenger, t.user_id, t.beschreibung);
        });
        db.run('COMMIT', () => {
            stmt.finalize();
            console.log(`✅ Successfully inserted ${txns.length} transactions!`);
            
            db.get('SELECT COUNT(*) as cnt FROM transactions', (err, row) => {
                console.log(`📊 Total transactions in database: ${row.cnt}\n`);
                db.close();
            });
        });
    });
}

main();
