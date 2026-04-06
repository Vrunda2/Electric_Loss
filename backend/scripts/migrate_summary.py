
import time
from backend.config.database import get_engine
from sqlalchemy import text

def migrate_city_summary():
    engine = get_engine()
    with engine.connect() as conn:
        print("Creating summary tables (city, tariffBase, acornBase)...")
        start = time.time()
        conn.execute(text("DROP TABLE IF EXISTS city_daily_summary"))
        conn.execute(text("DROP TABLE IF EXISTS tariff_summary"))
        conn.execute(text("DROP TABLE IF EXISTS acorn_summary"))
        
        conn.execute(text("""
            CREATE TABLE city_daily_summary (
                reading_date DATE PRIMARY KEY,
                active_households INT,
                avg_consumption DOUBLE,
                total_consumption DOUBLE,
                max_consumption DOUBLE,
                min_consumption DOUBLE
            ) ENGINE=InnoDB
        """))

        conn.execute(text("""
            CREATE TABLE tariff_summary (
                tariff_type VARCHAR(50) PRIMARY KEY,
                household_count INT,
                avg_daily_kwh DOUBLE,
                total_kwh DOUBLE
            ) ENGINE=InnoDB
        """))

        conn.execute(text("""
            CREATE TABLE acorn_summary (
                acorn_group VARCHAR(50) PRIMARY KEY,
                acorn_category VARCHAR(100),
                household_count INT,
                avg_daily_consumption DOUBLE,
                max_consumption DOUBLE,
                min_consumption DOUBLE
            ) ENGINE=InnoDB
        """))
        
        print("Populating city_daily_summary (instant lookups for trend chart)...")
        conn.execute(text("""
            INSERT INTO city_daily_summary (reading_date, active_households, avg_consumption, total_consumption, max_consumption, min_consumption)
            SELECT reading_date, COUNT(household_id), ROUND(AVG(energy_sum), 4), ROUND(SUM(energy_sum), 2), ROUND(MAX(energy_sum), 4), ROUND(MIN(energy_sum), 4) FROM daily_energy WHERE energy_sum > 0 GROUP BY reading_date
        """))

        print("Populating tariff_summary (instant lookups for dashboard doughnuts)...")
        conn.execute(text("""
            INSERT INTO tariff_summary (tariff_type, household_count, avg_daily_kwh, total_kwh)
            SELECT h.tariff_type, COUNT(DISTINCT h.household_id), ROUND(AVG(d.energy_sum), 4), ROUND(SUM(d.energy_sum), 2)
            FROM households h JOIN daily_energy d ON h.household_id = d.household_id WHERE d.energy_sum > 0 GROUP BY h.tariff_type
        """))

        print("Populating acorn_summary (instant lookups for analytics bar charts)...")
        conn.execute(text("""
            INSERT INTO acorn_summary (acorn_group, acorn_category, household_count, avg_daily_consumption, max_consumption, min_consumption)
            SELECT h.acorn_group, MAX(h.acorn_category), COUNT(DISTINCT h.household_id), ROUND(AVG(d.energy_sum), 4), ROUND(MAX(d.energy_sum), 4), ROUND(MIN(d.energy_sum), 4)
            FROM households h JOIN daily_energy d ON h.household_id = d.household_id WHERE d.energy_sum > 0 GROUP BY h.acorn_group
        """))

        conn.commit()
        end = time.time()
        print(f"✅ Full migration complete! Total time: {end-start:.2f} seconds.")

if __name__ == "__main__":
    migrate_city_summary()
