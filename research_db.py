
from backend.config.database import get_engine
from sqlalchemy import text, inspect

def research():
    engine = get_engine()
    with engine.connect() as conn:
        print("Checking daily_energy schema...")
        columns = [dict(r._mapping) for r in conn.execute(text("PRAGMA table_info(daily_energy)")).fetchall()]
        for c in columns:
            print(f"Column: {c['name']} ({c['type']}), PK: {c['pk']}")
        
        print("\nChecking daily_energy indexes...")
        indexes = [dict(r._mapping) for r in conn.execute(text("PRAGMA index_list(daily_energy)")).fetchall()]
        for idx in indexes:
            print(f"Index: {idx['name']}, Unique: {idx['unique']}")
            
        print("\nChecking daily_energy row count...")
        count = conn.execute(text("SELECT COUNT(*) FROM daily_energy")).scalar()
        print(f"Total Rows: {count:,}")
        
if __name__ == "__main__":
    research()
