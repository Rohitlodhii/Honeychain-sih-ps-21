"""
HoneyChain Pydantic Schemas
Request/response models for FastAPI endpoints.
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime


class UserRegisterRequest(BaseModel):
    """User registration payload."""
    name: str
    phone: str
    password: str
    role: Literal["beekeeper", "cooperative_admin"]
    cluster: Optional[str] = None
    email: Optional[str] = None
    admin_invite_code: Optional[str] = None


class UserLoginRequest(BaseModel):
    """User login payload."""
    phone: str
    password: str


class UserResponse(BaseModel):
    """User data returned to client."""
    id: str
    name: str
    phone: str
    email: Optional[str]
    role: str
    cluster: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class HiveCreateRequest(BaseModel):
    """Request to create a new hive."""
    name: str
    location: str
    species: str  # e.g., "apis_mellifera"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class HiveResponse(BaseModel):
    """Hive data with summary."""
    id: str
    name: str
    location: str
    species: str
    latitude: Optional[float]
    longitude: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class SensorReadingResponse(BaseModel):
    """Sensor reading for a hive."""
    id: str
    hive_id: str
    temperature_c: float
    humidity_pct: float
    weight_kg: float
    sound_hz: Optional[float]
    recorded_at: datetime

    class Config:
        from_attributes = True


class SensorReadingCreateRequest(BaseModel):
    """Measured hive data supplied by an authenticated user or gateway."""
    temperature_c: float
    humidity_pct: float = Field(..., ge=0, le=100)
    weight_kg: float = Field(..., ge=0)
    sound_hz: Optional[float] = Field(None, ge=0)
    recorded_at: Optional[datetime] = None


class BatchCreateRequest(BaseModel):
    """Request to create a new batch (harvest)."""
    hive_id: str
    honey_type: str  # e.g., "wildflower", "acacia"
    quantity_kg: float
    apiary_location: str
    moisture_pct: float = Field(..., ge=0, le=100, description="Measured moisture percentage; required for purity screening")


class BatchEventRequest(BaseModel):
    """Request to append an event to a batch."""
    event_type: str  # QUALITY_TEST, TRANSFER, PACKAGE, SALE
    payload: Dict[str, Any]  # Event-specific data


class LedgerBlockResponse(BaseModel):
    """Ledger block for display."""
    index: int
    batch_id: str
    event_type: str
    payload: Dict[str, Any]
    actor: str
    timestamp_str: str
    prev_hash: str
    hash: str
    nonce: int

    class Config:
        from_attributes = True


class BatchResponse(BaseModel):
    """Batch (honey lot) with full details."""
    id: str
    beekeeper_id: str
    hive_id: str
    honey_type: str
    quantity_kg: float
    harvest_date: datetime
    apiary_location: str
    moisture_pct: Optional[float]
    purity_score: Optional[float]
    status: str
    current_owner: str
    created_at: datetime

    class Config:
        from_attributes = True


class HiveHealthDiagnosisResponse(BaseModel):
    """Hive health assessment."""
    status: str  # HEALTHY, WATCH, HIGH_RISK
    confidence: float
    reasons: List[str]
    metrics: Dict[str, Any]


class ProductivityPredictionResponse(BaseModel):
    """Yield prediction."""
    yield_estimate_kg: float
    trend: str
    confidence: float
    next_harvest_days: Optional[int]
    recommendation: str


class VerifyBatchResponse(BaseModel):
    """Consumer verification response for a batch."""
    batch_id: str
    beekeeper_name: str
    beekeeper_cluster: Optional[str]
    honey_type: str
    quantity_kg: float
    harvest_date: datetime
    apiary_location: str
    moisture_pct: Optional[float]
    purity_score: Optional[float]
    status: str
    ledger_timeline: List[LedgerBlockResponse]
    chain_verification: Dict[str, Any]  # {valid: bool, errors: [str], first_tampering_at_index: int}
    authenticity_badge: str  # "VERIFIED" or "TAMPERED"


class AdminOverviewResponse(BaseModel):
    """KVIC cooperative admin dashboard."""
    total_beekeepers: int
    total_hives: int
    total_batches: int
    total_honey_kg: float
    batches_by_status: Dict[str, int]  # {"HARVESTED": 5, "PACKAGED": 10, ...}
    batches_by_cluster: Dict[str, int]
    avg_purity_score: float
    avg_hive_health_status: Dict[str, int]  # {"HEALTHY": 50, "WATCH": 10, ...}
    ledger_integrity: Dict[str, Any]  # Verification report


class SimulationResponse(BaseModel):
    """Response from hive simulation."""
    hive_id: str
    readings: List[SensorReadingResponse]
    health_status: HiveHealthDiagnosisResponse
    anomaly_detected: bool
    message: str

