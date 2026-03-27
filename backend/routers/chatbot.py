from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
import os, json, re
from sqlalchemy import text
from backend.config.database import get_engine

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# ── Configure Gemini ──────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

# ── Request / Response schemas ────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    history: Optional[list] = []

class ChatResponse(BaseModel):
    reply: str
    data: Optional[dict] = None
    sql_used: Optional[str] = None


# ── DB Schema context for Gemini ──────────────────────────────────────────────
DB_SCHEMA = """
You have access to a SmartGrid Analytics MySQL database with these tables:

1. households (household_id VARCHAR, acorn_group VARCHAR, acorn_category VARCHAR, tariff_type VARCHAR ['Std','ToU'], block_id VARCHAR)
2. daily_energy (household_id VARCHAR, reading_date DATE, energy_sum FLOAT, energy_mean FLOAT, energy_max FLOAT, energy_min FLOAT, energy_count INT)
3. anomalies (id INT, household_id VARCHAR, anomaly_type VARCHAR ['SPIKE','DROP','UNUSUAL_PATTERN'], severity VARCHAR ['CRITICAL','HIGH','MEDIUM'], energy_value FLOAT, expected_value FLOAT, deviation_percent FLOAT, detected_at DATETIME)
4. weather_daily (weather_date DATE, temp_max FLOAT, temp_min FLOAT, temp_mean FLOAT, humidity FLOAT, windspeed FLOAT, pressure FLOAT, cloudcover FLOAT, uvindex FLOAT, visibility FLOAT, moonphase FLOAT, icon VARCHAR, summary VARCHAR)
5. acorn_details (acorn_group VARCHAR, category VARCHAR, description TEXT)

Key facts:
- 5,566 households in London
- 3.5M+ daily energy readings from Nov 2011 to Feb 2014
- energy values are in kWh
- household IDs look like MAC000001, MAC000002, etc.
"""

# ── SQL Generation prompt ─────────────────────────────────────────────────────
SQL_SYSTEM_PROMPT = f"""You are a SmartGrid Analytics assistant with access to a London smart meter database.

{DB_SCHEMA}

Your job:
1. Understand the user's question
2. If it needs data from the database, generate a safe SELECT SQL query
3. If it's a general question (about energy, smart meters, concepts), answer directly without SQL

RULES for SQL:
- Only SELECT queries, never INSERT/UPDATE/DELETE/DROP
- Always add LIMIT (max 20 for lists, 1 for single values)
- Use proper column names from the schema above
- For date ranges use: WHERE reading_date BETWEEN '2011-11-01' AND '2014-02-28'

Respond in this EXACT JSON format:
{{
  "needs_sql": true/false,
  "sql": "SELECT ... (or null if no sql needed)",
  "thinking": "brief explanation of what you're doing",
  "direct_answer": "answer if no sql needed (or null)"
}}
"""

ANSWER_SYSTEM_PROMPT = f"""You are a friendly SmartGrid Analytics assistant for a London smart meter dashboard.

{DB_SCHEMA}

You will be given:
- The user's question
- SQL query that was run (if any)
- The query results as JSON

Your job: Give a clear, helpful, conversational answer.
- Use the data to answer specifically
- Format numbers nicely (e.g. "3.45 kWh", "1,234 households")
- If results are empty, say so and suggest alternatives
- Be concise but informative
- You can also answer general questions about energy, electricity, smart meters etc.
- Use markdown for formatting (bold, bullet points) when helpful
"""


# ── Helper: run SQL safely ────────────────────────────────────────────────────
def run_sql(sql: str) -> dict:
    """Run a SELECT query and return rows as list of dicts."""
    # Safety check
    forbidden = ["insert", "update", "delete", "drop", "alter", "create", "truncate"]
    sql_lower = sql.lower()
    for word in forbidden:
        if re.search(rf'\b{word}\b', sql_lower):
            return {"error": f"Forbidden operation: {word}"}

    try:
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            rows = result.fetchall()
            cols = result.keys()
            data = [dict(zip(cols, row)) for row in rows]
            # Convert non-serializable types
            for row in data:
                for k, v in row.items():
                    if hasattr(v, 'isoformat'):
                        row[k] = v.isoformat()
                    elif v is None:
                        row[k] = None
                    else:
                        try:
                            row[k] = float(v) if isinstance(v, (int, float)) else str(v)
                        except:
                            row[k] = str(v)
            return {"rows": data, "count": len(data)}
    except Exception as e:
        return {"error": str(e)}


# ── Main chat endpoint ────────────────────────────────────────────────────────
@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    user_msg = req.message.strip()

    try:
        # STEP 1: Ask Gemini whether we need SQL and what query
        step1_prompt = f"{SQL_SYSTEM_PROMPT}\n\nUser question: {user_msg}"
        step1_resp = model.generate_content(step1_prompt)
        raw = step1_resp.text.strip()

        # Clean markdown code blocks if present
        raw = re.sub(r'```json\s*', '', raw)
        raw = re.sub(r'```\s*', '', raw)
        raw = raw.strip()

        try:
            plan = json.loads(raw)
        except json.JSONDecodeError:
            # Fallback: treat as direct answer
            plan = {"needs_sql": False, "sql": None, "direct_answer": raw, "thinking": ""}

        # STEP 2: If SQL needed, run it
        db_result = None
        sql_used = None

        if plan.get("needs_sql") and plan.get("sql"):
            sql_used = plan["sql"]
            db_result = run_sql(sql_used)

        # STEP 3: Ask Gemini to formulate the final answer
        if plan.get("needs_sql"):
            step2_prompt = f"""{ANSWER_SYSTEM_PROMPT}

User question: {user_msg}
SQL executed: {sql_used}
Database result: {json.dumps(db_result, indent=2)[:3000]}

Give a helpful conversational answer based on this data."""
        else:
            step2_prompt = f"""{ANSWER_SYSTEM_PROMPT}

User question: {user_msg}
(No database query needed — answer from your knowledge)

Give a helpful conversational answer."""

        step2_resp = model.generate_content(step2_prompt)
        final_answer = step2_resp.text.strip()

        return ChatResponse(
            reply=final_answer,
            data=db_result,
            sql_used=sql_used
        )

    except Exception as e:
        return ChatResponse(
            reply=f"Sorry, I encountered an error: {str(e)}. Please check your Gemini API key and try again.",
            data=None,
            sql_used=None
        )


# ── Suggested questions endpoint ──────────────────────────────────────────────
@router.get("/suggestions")
async def get_suggestions():
    return {
        "suggestions": [
            "How many households are in the dataset?",
            "Which household has the highest average energy consumption?",
            "Show me the top 5 anomalies by deviation",
            "What is the average daily consumption in winter vs summer?",
            "How many CRITICAL anomalies are there?",
            "Compare Standard vs Time-of-Use tariff consumption",
            "What was the coldest day in the dataset?",
            "Which ACORN group consumes the most energy?",
            "Show households with more than 3 anomalies",
            "What is the total energy consumed in 2013?",
        ]
    }