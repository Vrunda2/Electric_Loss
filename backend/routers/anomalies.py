from fastapi import APIRouter, Query, BackgroundTasks
from typing import Optional
from backend.services.anomaly_service import (
    detect_anomalies, get_anomalies_from_db, train_anomaly_model
)

router = APIRouter(prefix="/anomalies", tags=["Anomalies"])

@router.get("/")
def list_anomalies(
    household_id: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(100, le=1000)
):
    return get_anomalies_from_db(household_id, severity, limit)

@router.post("/detect")
def run_detection(
    background_tasks: BackgroundTasks,
    household_id: Optional[str] = None
):
    """Trigger anomaly detection. Runs in background for full dataset."""
    background_tasks.add_task(detect_anomalies, household_id, True)
    return {"message": "Anomaly detection started in background ⚙️"}

@router.post("/detect/sync")
def run_detection_sync(household_id: Optional[str] = None):
    """Run anomaly detection synchronously (use for single household)."""
    results = detect_anomalies(household_id, save_to_db=True)
    return {"detected": len(results), "anomalies": results[:50]}

@router.post("/train")
def train_model():
    """Retrain the ML model."""
    train_anomaly_model()
    return {"message": "✅ Model trained and saved successfully"}