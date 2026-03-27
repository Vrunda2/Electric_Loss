# test_chatbot.py (or inside same router)

from fastapi import APIRouter
from pydantic import BaseModel
import google.generativeai as genai
import os

router = APIRouter(prefix="/test-chat", tags=["Test Chatbot"])

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

class ChatRequest(BaseModel):
    message: str

@router.post("/")
async def simple_chat(req: ChatRequest):
    try:
        response = model.generate_content(req.message)

        return {
            "reply": response.text
        }

    except Exception as e:
        return {
            "error": str(e)
        }