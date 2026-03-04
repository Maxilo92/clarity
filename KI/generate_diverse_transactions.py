import sqlite3
import random
from datetime import datetime, timedelta
import os
import json

def update_user_config(config_path="App/db/user_config.json"):
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        
        config["user"]["full_name"] = "Clarity User"
        config["user"]["nickname"] = "Clarity"
        
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        print(f"✅ Updated user_config.json to 'Clarity User'.")

def generate_diverse_db_english(db_path="App/db/transactions.db"):
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Clear existing transactions
    cursor.execute("DELETE FROM transactions")
    
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2026, 3, 4)
    
    categories = {
        "Income": [("Salary", "Clarity Corp"), ("Bonus", "Clarity Corp"), ("Interest", "Standard Bank"), ("Tax Refund", "IRS")],
        "Housing": [("Rent", "Metropolis Real Estate"), ("Electricity", "Energy Co"), ("Internet", "FiberLink"), ("Utilities", "City Services")],
        "Transport": [("Gas", "Shell"), ("Train Ticket", "Amtrak"), ("Car Insurance", "SafeDrive"), ("Parking", "Central Parking"), ("Uber", "Uber")],
        "Groceries": [("Whole Foods", "Whole Foods Market"), ("Trader Joe's", "Trader Joe's"), ("Walmart", "Walmart Inc"), ("Local Bakery", "Fresh Bakes"), ("Farmers Market", "Local Farm")],
        "Leisure": [("Cinema", "AMC Theatres"), ("Restaurant", "The Grill"), ("Cafe", "Coffee House"), ("Gym Membership", "FitLife"), ("Netflix", "Netflix"), ("Spotify", "Spotify"), ("Concert", "Ticketmaster")],
        "Insurance": [("Health Insurance", "HealthPlus"), ("Liability Insurance", "Global Safe")],
        "Shopping": [("Electronics", "Best Buy"), ("Clothing", "Zara"), ("Books", "Barnes & Noble"), ("Furniture", "IKEA"), ("Sporting Goods", "Decathlon"), ("Online Shopping", "Amazon")],
        "Health": [("Pharmacy", "CVS Pharmacy"), ("Drugstore", "Walgreens")],
        "Other": [("ATM Withdrawal", "Cash Point"), ("PayPal", "PayPal Europe"), ("Gift", "Family & Friends")]
    }

    user_name = "Clarity"
    
    entries = []
    
    # Pre-generate recurring transactions (Income vs Fixed Costs)
    # Salary: 10500.00 (significantly increased to ensure positive balance with spikes)
    # Rent: 1200.00
    # Fixed Subscriptions: ~200.00
    
    temp_date = start_date
    while temp_date <= end_date:
        # Salary on 25th
        if temp_date.day == 25:
            entries.append({
                "name": "Monthly Salary", "kategorie": "Income", "wert": 10500.00,
                "timestamp": temp_date.replace(hour=8, minute=0).isoformat() + "Z",
                "sender": "Clarity Corp", "empfaenger": user_name
            })
        
        # Rent on 1st
        if temp_date.day == 1:
            entries.append({
                "name": "Apartment Rent", "kategorie": "Housing", "wert": -1200.00,
                "timestamp": temp_date.replace(hour=0, minute=1).isoformat() + "Z",
                "sender": user_name, "empfaenger": "Metropolis Real Estate"
            })
            entries.append({
                "name": "Gym Membership", "kategorie": "Leisure", "wert": -45.00,
                "timestamp": temp_date.replace(hour=2, minute=0).isoformat() + "Z",
                "sender": user_name, "empfaenger": "FitLife"
            })

        # Internet on 10th
        if temp_date.day == 10:
            entries.append({
                "name": "Fiber Internet", "kategorie": "Housing", "wert": -49.99,
                "timestamp": temp_date.replace(hour=9, minute=0).isoformat() + "Z",
                "sender": user_name, "empfaenger": "FiberLink"
            })

        # Streaming on 15th
        if temp_date.day == 15:
            entries.append({
                "name": "Netflix Subscription", "kategorie": "Leisure", "wert": -19.99,
                "timestamp": temp_date.replace(hour=10, minute=0).isoformat() + "Z",
                "sender": user_name, "empfaenger": "Netflix"
            })
            entries.append({
                "name": "Spotify Premium", "kategorie": "Leisure", "wert": -12.99,
                "timestamp": temp_date.replace(hour=10, minute=5).isoformat() + "Z",
                "sender": user_name, "empfaenger": "Spotify"
            })

        # Generate daily transactions (2 to 4 per day)
        # Target daily budget: ~60.00 avg to keep it well below 3100.00/month
        num_trans = random.randint(2, 4)
        for _ in range(num_trans):
            cat = random.choice([k for k in categories.keys() if k not in ["Income", "Insurance"]])
            item, partner = random.choice(categories[cat])
            
            hour = random.randint(7, 21)
            minute = random.randint(0, 59)
            dt = temp_date.replace(hour=hour, minute=minute)
            
            if cat == "Groceries":
                wert = -round(random.uniform(5.0, 120.0), 2)
            elif cat == "Shopping":
                if random.random() > 0.9:
                    wert = -round(random.uniform(400.0, 1500.0), 2) # Spike
                else:
                    wert = -round(random.uniform(20.0, 300.0), 2)
            elif cat == "Transport":
                if random.random() > 0.95:
                    wert = -round(random.uniform(200.0, 600.0), 2) # Spike
                else:
                    wert = -round(random.uniform(5.0, 100.0), 2)
            elif cat == "Leisure":
                if temp_date.weekday() >= 5: # Weekends more expensive
                    wert = -round(random.uniform(50.0, 400.0), 2)
                else:
                    wert = -round(random.uniform(10.0, 150.0), 2)
            else:
                wert = -round(random.uniform(5.0, 100.0), 2)
            
            entries.append({
                "name": item,
                "kategorie": cat,
                "wert": wert,
                "timestamp": dt.isoformat() + "Z",
                "sender": user_name,
                "empfaenger": partner
            })

        temp_date += timedelta(days=1)

    # Add some random high income (Bonus) to ensure profit
    for month in range(1, 13):
        if random.random() > 0.7:
            bonus_date = datetime(2025, month, 15, 12, 0)
            entries.append({
                "name": "Quarterly Performance Bonus", "kategorie": "Income", "wert": 1200.00,
                "timestamp": bonus_date.isoformat() + "Z",
                "sender": "Clarity Corp", "empfaenger": user_name
            })

    # Sort and Insert
    entries.sort(key=lambda x: x["timestamp"])

    for i, entry in enumerate(entries):
        cursor.execute("""
            INSERT INTO transactions (id, name, kategorie, wert, timestamp, sender, empfaenger)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (i + 1, entry["name"], entry["kategorie"], entry["wert"], entry["timestamp"], entry["sender"], entry["empfaenger"]))

    conn.commit()
    
    # Verify profit
    cursor.execute("SELECT SUM(wert) FROM transactions WHERE timestamp LIKE '2025%'")
    total_2025 = cursor.fetchone()[0]
    
    conn.close()
    print(f"✅ Database recreated with {len(entries)} English entries.")
    print(f"📊 Net Profit for 2025: {total_2025:,.2f} EUR")

if __name__ == "__main__":
    update_user_config()
    generate_diverse_db_english()
