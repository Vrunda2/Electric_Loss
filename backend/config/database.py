import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from urllib.parse import quote_plus  # ← THIS fixes the @ symbol issue

load_dotenv()

def get_engine():
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "3306")
    user = os.getenv("DB_USER", "root")
    password = quote_plus(os.getenv("DB_PASSWORD", ""))  # ← encodes @ safely
    database = os.getenv("DB_NAME", "Electric_Loss")

    url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"
    return create_engine(url, pool_size=5, echo=False)

def test_connection():
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
            print("✅ DB connection successful!")
            return True
    except Exception as e:
        print(f"❌ DB connection failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing connection...")
    test_connection()
    print("Done.")