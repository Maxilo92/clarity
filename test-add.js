const fetch = require('node-fetch');

async function testAdd() {
    const res = await fetch('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            company_id: 1,
            user_id: 1,
            name: "Test Transaktion",
            kategorie: "Food",
            wert: -15.50,
            sender: "Max",
            empfaenger: "REWE",
            timestamp: new Date().toISOString(),
            beschreibung: "Test"
        })
    });
    const data = await res.json();
    console.log(data);
}

testAdd();
