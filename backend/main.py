from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.routers import households, energy, anomalies, weather, analytics, forecast
from backend.routers.chatbot import router as chatbot_router
app.include_router(chatbot_router)

app = FastAPI(
    title=" SmartGrid Analytics API",
    description="Energy anomaly detection and analytics platform for London smart meters",
    version="1.0.0"
)

# CORS — allows React frontend to call this API
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173", "http://localhost:3000"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,    # must be False when using "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(households.router)
app.include_router(energy.router)
app.include_router(anomalies.router)
app.include_router(weather.router)
app.include_router(analytics.router)
app.include_router(forecast.router)

# Mount static files for the frontend
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

@app.get("/health")
def health():
    return {"status": "healthy"}