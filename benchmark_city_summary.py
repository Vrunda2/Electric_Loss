
import time
from backend.config.database import get_engine
from sqlalchemy import text

def benchmark():
    engine = get_engine()
    start = time.time()
    with engine.connect() as conn:
        print("Starting benchmark of City Summary SQL...")
        query = text("""
            SELECT reading_date, AVG(energy_sum) 
            FROM daily_energy 
            WHERE energy_sum IS NOT NULL 
            GROUP BY reading_date
        """)
        res = conn.execute(query).fetchall()
        print(f"Rows returned: {len(res)}")
    end = time.time()
    print(f"Time taken to aggregate 3.5M rows: {end-start:.2f} seconds")

if __name__ == "__main__":
    benchmark()
