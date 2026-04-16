from backend.config.database import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    print("Checking counts of daily_energy records in households...")
    res = conn.execute(text("SELECT household_id, COUNT(*) as c FROM daily_energy GROUP BY household_id ORDER BY c DESC LIMIT 5")).fetchall()
    for row in res:
        print(f"Household: {row[0]} | Count: {row[1]}")
