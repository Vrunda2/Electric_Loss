
import time
from backend.config.database import get_engine
from sqlalchemy import text

def benchmark_breakdown():
    engine = get_engine()
    with engine.connect() as conn:
        print("Breaking down dashboard query performance...")
        
        s = time.time()
        conn.execute(text("SELECT 1")).fetchone()
        print(f"Ping: {time.time()-s:.4f}s")
        
        s = time.time()
        conn.execute(text("""
            SELECT
                SUM(active_households),
                SUM(total_consumption) / SUM(active_households),
                MIN(reading_date),
                MAX(reading_date)
            FROM city_daily_summary
        """)).fetchone()
        print(f"City Summary Stats (800 rows): {time.time()-s:.4f}s")
        
        s = time.time()
        conn.execute(text("SELECT COUNT(*) FROM households")).scalar()
        print(f"Households Count: {time.time()-s:.4f}s")
        
        s = time.time()
        conn.execute(text("SELECT COUNT(*) FROM anomalies")).scalar()
        print(f"Anomalies Count: {time.time()-s:.4f}s")

if __name__ == "__main__":
    benchmark_breakdown()
