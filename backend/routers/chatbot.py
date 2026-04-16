"""
chatbot.py — 2026 Optimized RAG System Engine
Uses Gemini API for both Embeddings (gemini-embedding-001) and Generation (gemini-2.0-flash).
Retrieval is done via pure native cosine similarity matching against chatbot_qa.json.
Uses "Context Injection" for system-level instructions to guarantee 100% field compatibility.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import os
import httpx
import json
import math
import asyncio
from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends
from backend.auth.dependencies import get_current_user
router = APIRouter(prefix="/chatbot", tags=["Chatbot"], dependencies=[Depends(get_current_user)])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Using v1 and gemini-2.5-flash-lite for maximum free-tier availability in 2026
EMBEDDING_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-embedding-001:embedContent"
GENERATION_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent"

# ── RAG Vector Store & Local Fallback ─────────────────────────────────────────
QA_KNOWLEDGE_BASE = []

def local_search_fallback(query: str) -> str:
    """Simple keyword-based fallback if Embedding API fails."""
    query_words = set(query.lower().split())
    matches = []
    path = os.path.join(os.path.dirname(__file__), "chatbot_qa.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data:
                # Basic overlap score + manual boost for ACORN/Tariff keywords
                text = (item['question'] + " " + item['answer']).lower()
                score = sum(1 for word in query_words if word in text)
                
                # Manual typo handling for "acron" -> "acorn"
                if "acron" in query.lower() and "acorn" in text:
                    score += 2

                if score > 0:
                    matches.append((score, f"Information: {item['answer']}"))
        matches.sort(key=lambda x: x[0], reverse=True)
        return "\n\n---\n\n".join([m[1] for m in matches[:3]])
    except:
        return ""

def cosine_similarity(v1, v2):
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_v1 = math.sqrt(sum(a * a for a in v1))
    norm_v2 = math.sqrt(sum(b * b for b in v2))
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)

async def get_embedding(text: str) -> list[float]:
    payload = {
        "model": "models/gemini-embedding-001",
        "content": {"parts": [{"text": text}]}
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(f"{EMBEDDING_URL}?key={GEMINI_API_KEY}", json=payload)
            if response.status_code == 200:
                data = response.json()
                if "embedding" in data and "values" in data["embedding"]:
                    return data["embedding"]["values"]
        return []
    except:
        return []

async def initialize_rag():
    global QA_KNOWLEDGE_BASE
    if not GEMINI_API_KEY:
        return

    path = os.path.join(os.path.dirname(__file__), "chatbot_qa.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            qa_data = json.load(f)
    except:
        return

    print("Building vectors...")
    for item in qa_data:
        text_to_embed = f"Question: {item['question']}\nInformation: {item['answer']}"
        vector = await get_embedding(text_to_embed)
        if vector:
            QA_KNOWLEDGE_BASE.append({
                "id": item["id"],
                "text": text_to_embed,
                "answer": item["answer"],
                "vector": vector
            })
        await asyncio.sleep(0.5) # Aggressive delay to stay under free tier RPM
    print(f"RAG Ready ({len(QA_KNOWLEDGE_BASE)} chunks)")

async def _ensure_rag_initialized():
    if len(QA_KNOWLEDGE_BASE) == 0 and GEMINI_API_KEY:
        await initialize_rag()

async def search_rag(query: str, top_k: int = 5) -> str:
    await _ensure_rag_initialized()
    
    # Try AI Embedding first
    query_vector = await get_embedding(query)
    if query_vector:
        scored = []
        for fact in QA_KNOWLEDGE_BASE:
            sim = cosine_similarity(query_vector, fact["vector"])
            scored.append((sim, fact["text"]))
        scored.sort(key=lambda x: x[0], reverse=True)
        # Lowered threshold from 0.4 to 0.35 to capture more semantically close matches
        top_contexts = [text for sim, text in scored[:top_k] if sim > 0.35]
        if top_contexts:
            return "\n\n---\n\n".join(top_contexts)
    
    # Local Fallback if AI search fails or has 0 chunks
    return local_search_fallback(query)


# ── System Prompts ────────────────────────────────────────────────────────────
# CONTEXT_INJECTION instead of systemInstruction field
SYSTEM_RULES = """You are SmartGrid AI, the expert assistant for the SmartGrid Analytics platform built on the Low Carbon London dataset (2011-2014).
Answer ONLY the user's LATEST message using the relevant facts from the knowledge base below.

KNOWLEDGE BASE:
{context}

STRICT RULES:
1. Answer ONLY what was asked in the LATEST message. Do not volunteer extra facts.
2. Do NOT repeat any previous answer already given in the conversation history.
3. Do NOT use Markdown bold (**) or asterisks. Use plain text only.
4. Keep answers to 2-3 clear sentences maximum.
5. If the answer is not in the knowledge base, respond exactly: "I don't have that specific information in my knowledge base."
6. For numbers, always include the correct unit (kWh, GBP, households, etc)."""

GREETING_REPLY = """Hi User I'm your **AI Assistant**.

I am equipped with a Semantic Similarity Search engine directly connected to the project's Knowledge Base. I fetch exact facts to guarantee perfectly accurate answers.

What would you like to know? You can also tap one of the suggestion chips below to get started!"""

GREETINGS = {"hi", "hello", "hey", "hiya", "howdy", "greetings", "good morning", "good afternoon", "good evening"}

def is_greeting(text: str) -> bool:
    clean = text.lower().strip()
    return clean in GREETINGS or any(clean.startswith(g) for g in GREETINGS)


# ── Request / Response schemas ────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    history: Optional[list] = []

class ChatResponse(BaseModel):
    reply: str
    data: Optional[dict] = None
    sql_used: Optional[str] = None
    matched_id: Optional[int] = None


# ── Call Gemini Generation API ────────────────────────────────────────────────
async def call_gemini(user_message: str, history: list, rag_context: str) -> str:
    if not GEMINI_API_KEY:
        return "**Gemini API key not found.** Please add `GEMINI_API_KEY=your_key` to your `.env` file and restart the server."

    # Stable 2026 architecture: Inject context rules as the first model-turn message
    dynamic_context = SYSTEM_RULES.format(context=rag_context)

    contents = []
    # 1. Inject the "Rules & Context" first as a system message (via content user role for legacy compatibility)
    contents.append({
        "role": "user",
        "parts": [{"text": f"SYSTEM SYSTEM RULES: {dynamic_context}"}]
    })
    # No "Acknowledged" model turn here anymore to prevent the model from starting its next answer with a confirmation.


    # 2. Add recent history (filter out any internal tags if they leaked)
    for msg in history[-6:]:  # expanded memory slightly
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant") and content:
            if "SYSTEM SYSTEM RULES" in content: continue # Skip internal rule leaks
            contents.append({
                "role": "user" if role == "user" else "model",
                "parts": [{"text": content}]
            })

    # 3. Add current user message
    contents.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.2, 
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 1024
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(f"{GENERATION_URL}?key={GEMINI_API_KEY}", json=payload)

    if response.status_code != 200:
        error = response.json().get("error", {}).get("message", f"HTTP {response.status_code}")
        return f"⚠ **Gemini API error:** {error}"

    data = response.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


# ── Main chat endpoint ────────────────────────────────────────────────────────
@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    user_msg = req.message.strip()

    if not user_msg:
        return ChatResponse(reply="Please type a question and I'll do my best to help!")

    if is_greeting(user_msg):
        return ChatResponse(reply=GREETING_REPLY)

    # Perform RAG Vector similarity search 
    rag_context = await search_rag(user_msg, top_k=3)

    # Feed context and question to Gemini 2.0 Stable
    reply = await call_gemini(user_msg, req.history or [], rag_context)
    return ChatResponse(reply=reply)


# ── Suggestions & Topics ──────────────────────────────────────────────────────
@router.get("/suggestions")
async def get_suggestions():
    return {
        "suggestions": [
            "How are anomalies detected?",
            "How does the forecasting model work?",
            "What are ACORN groups?",
            "How is electricity cost calculated?",
            "How is weather correlated with energy?",
            "How is the API secured?",
            "Standard vs Time-of-Use tariff?",
            "What time period does data cover?",
        ]
    }

@router.get("/topics")
async def get_topics():
    path = os.path.join(os.path.dirname(__file__), "chatbot_qa.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            qa_data = json.load(f)
            return {
                "topics": [{"id": item["id"], "question": item["question"]} for item in qa_data[:8]],
                "count": min(8, len(qa_data))
            }
    except Exception:
        return {"topics": [], "count": 0}