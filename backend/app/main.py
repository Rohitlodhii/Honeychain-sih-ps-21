"""
HoneyChain FastAPI Backend
Main application with all routes for authentication, hives, batches, ledger, and verification.
"""

import uuid
import random
import re
from datetime import datetime
from typing import Optional, List
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from fastapi import FastAPI, Depends, HTTPException, Header, Query, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import func

import qrcode
from pydantic import ValidationError

from .database import get_db_config, get_db, DatabaseConfig
from .models import User, Hive, Batch, SensorReading, LedgerBlock
from .schemas import (
    UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse,
    HiveCreateRequest, HiveResponse, SensorReadingResponse, SensorReadingCreateRequest,
    BatchCreateRequest, BatchEventRequest, BatchResponse, LedgerBlockResponse,
    HiveHealthDiagnosisResponse, ProductivityPredictionResponse,
    VerifyBatchResponse, AdminOverviewResponse, SimulationResponse,
)
from .auth import AuthService
from .ledger import HoneyLedger, LedgerBlock as LedgerBlockModel
from .analytics import ApicultureAnalytics
from .config import frontend_url, required_secret_key, cors_origins, development_only_features_enabled, validate_twilio_signature

# Initialize FastAPI app
app = FastAPI(
    title="HoneyChain API",
    description="Blockchain-based honey traceability for KVIC's Honey Mission",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
def health_check():
    """Unauthenticated process health probe for Docker and hosting platforms."""
    return {"status": "ok"}

def persisted_ledger(db: Session) -> HoneyLedger:
    """Reconstruct the ledger from durable DB rows for every write/check.

    This makes integrity verification survive process restarts and avoids an
    in-memory source of truth. The database intentionally stores only business
    events (not the transient genesis block); each persisted event hash and all
    persisted inter-event links are verified.
    """
    rows = db.query(LedgerBlock).order_by(LedgerBlock.index).all()
    if not rows:
        return HoneyLedger()
    return HoneyLedger.from_dict({"blocks": [
        {
            "index": row.index, "batch_id": row.batch_id,
            "event_type": row.event_type, "payload": row.payload,
            "actor": row.actor, "timestamp": row.timestamp_str,
            "prev_hash": row.prev_hash, "nonce": row.nonce, "hash": row.hash,
        }
        for row in rows
    ]})


def save_sensor_reading(db: Session, hive: Hive, temperature_c: float, humidity_pct: float,
                        weight_kg: float, sound_hz: Optional[float] = None,
                        recorded_at: Optional[datetime] = None) -> SensorReading:
    """Single write path shared by authenticated API and Twilio webhook intake."""
    reading = SensorReading(
        id=str(uuid.uuid4()), hive_id=hive.id, temperature_c=temperature_c,
        humidity_pct=humidity_pct, weight_kg=weight_kg, sound_hz=sound_hz,
        recorded_at=recorded_at or datetime.utcnow(),
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


# ============================================================================
# Dependency: Current User
# ============================================================================

async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate current user from JWT token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

    user = AuthService.get_user_from_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user


# ============================================================================
# Auth Routes
# ============================================================================

@app.post("/api/auth/register", response_model=UserResponse)
def register(request: UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new beekeeper or cooperative admin."""
    try:
        user = AuthService.register_user(
            db=db,
            name=request.name,
            phone=request.phone,
            password=request.password,
        role=request.role,
        cluster=request.cluster,
        email=request.email,
        admin_invite_code_value=request.admin_invite_code,
        )
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/login", response_model=TokenResponse)
def login(request: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = AuthService.authenticate_user(db, request.phone, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid phone or password")

    token = AuthService.create_access_token(data={"sub": user.id})
    return TokenResponse(
        access_token=token,
        user=UserResponse.from_orm(user),
    )


@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse.from_orm(current_user)


# ============================================================================
# Hive Routes
# ============================================================================

@app.post("/api/hives", response_model=HiveResponse)
def create_hive(
    request: HiveCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new hive for the beekeeper."""
    hive = Hive(
        id=str(uuid.uuid4()),
        beekeeper_id=current_user.id,
        name=request.name,
        location=request.location,
        species=request.species,
        latitude=request.latitude,
        longitude=request.longitude,
    )
    db.add(hive)
    db.commit()
    db.refresh(hive)
    return HiveResponse.from_orm(hive)


@app.get("/api/hives", response_model=List[HiveResponse])
def list_hives(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all hives for the current beekeeper."""
    hives = db.query(Hive).filter(Hive.beekeeper_id == current_user.id).all()
    return [HiveResponse.from_orm(h) for h in hives]


@app.get("/api/hives/{hive_id}/readings", response_model=List[SensorReadingResponse])
def get_hive_readings(
    hive_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get recent sensor readings for a hive."""
    hive = db.query(Hive).filter(Hive.id == hive_id, Hive.beekeeper_id == current_user.id).first()
    if not hive:
        raise HTTPException(status_code=404, detail="Hive not found")

    readings = db.query(SensorReading).filter(SensorReading.hive_id == hive_id).order_by(
        SensorReading.recorded_at.desc()
    ).limit(100).all()

    return [SensorReadingResponse.from_orm(r) for r in readings]


@app.get("/api/hives/{hive_id}/health", response_model=dict)
def get_hive_health(
    hive_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get hive health diagnosis and productivity prediction."""
    hive = db.query(Hive).filter(Hive.id == hive_id, Hive.beekeeper_id == current_user.id).first()
    if not hive:
        raise HTTPException(status_code=404, detail="Hive not found")

    # Get latest reading
    latest_reading = db.query(SensorReading).filter(
        SensorReading.hive_id == hive_id
    ).order_by(SensorReading.recorded_at.desc()).first()

    if not latest_reading:
        raise HTTPException(status_code=404, detail="No sensor readings for this hive")

    # Analyze health
    diagnosis = ApicultureAnalytics.analyze_hive_health(
        temperature_c=latest_reading.temperature_c,
        humidity_pct=latest_reading.humidity_pct,
        sound_hz=latest_reading.sound_hz,
        weight_kg=latest_reading.weight_kg,
    )

    # Predict productivity
    all_weights = [r.weight_kg for r in db.query(SensorReading).filter(
        SensorReading.hive_id == hive_id
    ).order_by(SensorReading.recorded_at).all()]

    all_dates = [r.recorded_at.isoformat() for r in db.query(SensorReading).filter(
        SensorReading.hive_id == hive_id
    ).order_by(SensorReading.recorded_at).all()]

    productivity = ApicultureAnalytics.predict_productivity(all_weights, all_dates) if len(all_weights) > 1 else {
        "yield_estimate_kg": 0,
        "trend": "insufficient_data",
        "confidence": 0,
        "next_harvest_days": None,
        "recommendation": "Need at least 2 readings over time.",
    }

    return {
        "hive_id": hive_id,
        "health": {
            "status": diagnosis.status,
            "confidence": diagnosis.confidence,
            "reasons": diagnosis.reasons,
            "metrics": diagnosis.metrics,
        },
        "productivity": productivity,
        "latest_reading": SensorReadingResponse.from_orm(latest_reading),
    }


@app.post("/api/hives/{hive_id}/readings", response_model=SensorReadingResponse)
def create_hive_reading(
    hive_id: str,
    request: SensorReadingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Persist a manually measured reading; values are never generated here."""
    hive = db.query(Hive).filter(Hive.id == hive_id, Hive.beekeeper_id == current_user.id).first()
    if not hive:
        raise HTTPException(status_code=404, detail="Hive not found")
    return SensorReadingResponse.from_orm(save_sensor_reading(
        db, hive, request.temperature_c, request.humidity_pct, request.weight_kg,
        request.sound_hz, request.recorded_at,
    ))


@app.post("/api/hives/{hive_id}/simulate", response_model=SimulationResponse)
def simulate_hive_readings(
    hive_id: str,
    anomaly: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Simulate 5 sensor readings for a hive.
    If anomaly=true, include one reading indicating disease/stress.
    """
    if not development_only_features_enabled():
        raise HTTPException(status_code=404, detail="Not found")
    hive = db.query(Hive).filter(Hive.id == hive_id, Hive.beekeeper_id == current_user.id).first()
    if not hive:
        raise HTTPException(status_code=404, detail="Hive not found")

    readings_data = []
    anomaly_detected = False

    for i in range(5):
        if anomaly and i == 2:
            # Anomalous reading: very low temperature + acoustic anomaly
            temp = 28.5  # Below optimal
            humidity = 72.0  # High
            weight = 25.0 + random.uniform(-0.5, 0.2)
            sound = 150.0  # Below healthy range → disease/starvation indicator
            anomaly_detected = True
        else:
            # Normal reading
            temp = 34.5 + random.uniform(-1, 1)
            humidity = 58.0 + random.uniform(-3, 3)
            weight = 25.0 + random.uniform(-0.2, 0.5)
            sound = 220.0 + random.uniform(-20, 20)

        reading = SensorReading(
            id=str(uuid.uuid4()),
            hive_id=hive_id,
            temperature_c=round(temp, 1),
            humidity_pct=round(humidity, 1),
            weight_kg=round(weight, 2),
            sound_hz=round(sound, 0),
            recorded_at=datetime.utcnow(),
        )
        db.add(reading)
        readings_data.append(reading)

    db.commit()

    # Get latest reading for health diagnosis
    latest = readings_data[-1]
    diagnosis = ApicultureAnalytics.analyze_hive_health(
        temperature_c=latest.temperature_c,
        humidity_pct=latest.humidity_pct,
        sound_hz=latest.sound_hz,
        weight_kg=latest.weight_kg,
    )

    return SimulationResponse(
        hive_id=hive_id,
        readings=[SensorReadingResponse.from_orm(r) for r in readings_data],
        health_status=diagnosis,
        anomaly_detected=anomaly_detected,
        message="Simulation complete. Anomaly detected." if anomaly_detected else "Simulation complete.",
    )


def sms_reply(message: str) -> Response:
    safe_message = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return Response(f"<?xml version=\"1.0\"?><Response><Message>{safe_message}</Message></Response>", media_type="application/xml")


def ingest_sms_reading(from_phone: str, body: str, db: Session) -> Response:
    """Parse a Twilio body and reuse the normal persisted-reading write path."""
    match = re.fullmatch(
        r"\s*([A-Za-z0-9_-]+)\s+TEMP\s+(-?\d+(?:\.\d+)?)\s+HUM\s+(\d+(?:\.\d+)?)(?:\s+SOUND\s+(\d+(?:\.\d+)?))?\s*",
        body,
        flags=re.IGNORECASE,
    )
    if not match:
        return sms_reply("Format: HIVE1 TEMP 34 HUM 55 [SOUND 220]")
    hive_code, temp, humidity, sound = match.groups()
    hive = db.query(Hive).join(User).filter(
        User.phone == from_phone, func.lower(Hive.name) == hive_code.lower()
    ).first()
    if not hive:
        return sms_reply("Hive code not found for this phone number.")
    latest = db.query(SensorReading).filter(SensorReading.hive_id == hive.id).order_by(
        SensorReading.recorded_at.desc()
    ).first()
    if not latest:
        return sms_reply("Record one reading with weight in the app before SMS intake.")
    reading = save_sensor_reading(db, hive, float(temp), float(humidity), latest.weight_kg,
                                  float(sound) if sound is not None else None)
    diagnosis = ApicultureAnalytics.analyze_hive_health(
        reading.temperature_c, reading.humidity_pct, reading.sound_hz, reading.weight_kg
    )
    return sms_reply(f"{hive.name}: {diagnosis.status}. {diagnosis.reasons[0]}")


@app.post("/api/sms/webhook")
async def sms_webhook(request: Request, db: Session = Depends(get_db)):
    """Twilio form webhook; production rejects unsigned or spoofed requests."""
    form = await request.form()
    params = {key: str(value) for key, value in form.items()}
    if not validate_twilio_signature(request.headers.get("X-Twilio-Signature"), str(request.url), params):
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")
    from_phone, body = params.get("From"), params.get("Body")
    if not from_phone or not body:
        raise HTTPException(status_code=422, detail="Twilio From and Body are required")
    return ingest_sms_reading(from_phone, body, db)


@app.post("/api/sms/simulate")
def simulate_sms_webhook(
    from_phone: str = Form(...),
    body: str = Form(...),
    db: Session = Depends(get_db),
):
    if not development_only_features_enabled():
        raise HTTPException(status_code=404, detail="Not found")
    return ingest_sms_reading(from_phone, body, db)


# ============================================================================
# Batch Routes
# ============================================================================

@app.post("/api/batches", response_model=dict)
def create_batch(
    request: BatchCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new honey batch (harvest).
    Automatically writes a HARVEST block to the ledger.
    Returns batch_id and verify_url.
    """
    # Resolve hive: tolerate missing/blank hive_id from older dashboard builds
    # by falling back to the caller's hive instead of returning a bare 404.
    raw_hive_id = (request.hive_id or "").strip() or None
    hive = None
    if raw_hive_id:
        hive = db.query(Hive).filter(Hive.id == raw_hive_id, Hive.beekeeper_id == current_user.id).first()
        if not hive:
            # Distinguish "no such hive" from "someone else's hive" for debugging.
            exists_anywhere = db.query(Hive).filter(Hive.id == raw_hive_id).first()
            if exists_anywhere:
                raise HTTPException(status_code=403, detail="Hive belongs to a different beekeeper")
            raise HTTPException(status_code=404, detail=f"Hive not found: {raw_hive_id}")
    else:
        user_hives = db.query(Hive).filter(Hive.beekeeper_id == current_user.id).order_by(Hive.created_at).all()
        if not user_hives:
            raise HTTPException(status_code=404, detail="No hives found. Create a hive before harvesting a batch.")
        if len(user_hives) > 1:
            raise HTTPException(
                status_code=422,
                detail=f"hive_id is required when you own {len(user_hives)} hives. Pass the hive to harvest from.",
            )
        hive = user_hives[0]

    # Validate remaining payload explicitly so failures are 422, not DB errors.
    if not (request.honey_type or "").strip():
        raise HTTPException(status_code=422, detail="honey_type is required")
    if not (request.apiary_location or "").strip():
        raise HTTPException(status_code=422, detail="apiary_location is required")
    if request.quantity_kg is None or request.quantity_kg <= 0:
        raise HTTPException(status_code=422, detail="quantity_kg must be greater than 0")

    # Analyze honey purity
    purity_result = ApicultureAnalytics.score_purity(moisture_pct=request.moisture_pct)

    batch = Batch(
        id=str(uuid.uuid4()),
        beekeeper_id=current_user.id,
        hive_id=hive.id,
        honey_type=request.honey_type.strip(),
        quantity_kg=request.quantity_kg,
        harvest_date=datetime.utcnow(),
        apiary_location=request.apiary_location.strip(),
        moisture_pct=request.moisture_pct,
        purity_score=purity_result["purity_score"],
        status="HARVESTED",
        current_owner=current_user.id,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # Write HARVEST block to ledger
    harvest_payload = {
        "quantity_kg": request.quantity_kg,
        "honey_type": request.honey_type,
        "apiary_location": request.apiary_location,
        "moisture_pct": request.moisture_pct,
        "purity_score": purity_result["purity_score"],
    }
    block = persisted_ledger(db).append_event(
        batch_id=batch.id,
        event_type="HARVEST",
        payload=harvest_payload,
        actor=current_user.id,
    )

    # Store block in DB
    ledger_block = LedgerBlock(
        id=str(uuid.uuid4()),
        index=block.index,
        batch_id=batch.id,
        event_type=block.event_type,
        payload=block.payload,
        actor=block.actor,
        timestamp_str=block.timestamp,
        prev_hash=block.prev_hash,
        hash=block.hash,
        nonce=block.nonce,
    )
    db.add(ledger_block)
    db.commit()

    return {
        # `id` + `hive_id` keep the dashboard list working when it appends
        # this response directly; `batch_id` keeps older clients working.
        "id": batch.id,
        "batch_id": batch.id,
        "hive_id": batch.hive_id,
        "honey_type": batch.honey_type,
        "quantity_kg": batch.quantity_kg,
        "status": batch.status,
        "verify_url": f"/verify/{batch.id}",
        "purity_score": purity_result["purity_score"],
        "purity_status": purity_result["status"],
    }


@app.get("/api/batches", response_model=List[BatchResponse])
def list_batches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all batches for the current beekeeper."""
    batches = db.query(Batch).filter(Batch.beekeeper_id == current_user.id).all()
    return [BatchResponse.from_orm(b) for b in batches]


@app.post("/api/batches/{batch_id}/events", response_model=dict)
def add_batch_event(
    batch_id: str,
    request: BatchEventRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Append an event (QUALITY_TEST, TRANSFER, PACKAGE, SALE) to a batch.
    Updates batch status and ledger.
    """
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.beekeeper_id == current_user.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Update batch status based on event type
    status_map = {
        "QUALITY_TEST": "QUALITY_TEST",
        "TRANSFER": "TRANSFERRED",
        "PACKAGE": "PACKAGED",
        "SALE": "SOLD",
    }
    batch.status = status_map.get(request.event_type, batch.status)
    batch.current_owner = request.payload.get("new_owner", batch.current_owner)

    # Append block to ledger
    block = persisted_ledger(db).append_event(
        batch_id=batch.id,
        event_type=request.event_type,
        payload=request.payload,
        actor=current_user.id,
    )

    # Store in DB
    ledger_block = LedgerBlock(
        id=str(uuid.uuid4()),
        index=block.index,
        batch_id=batch.id,
        event_type=block.event_type,
        payload=block.payload,
        actor=block.actor,
        timestamp_str=block.timestamp,
        prev_hash=block.prev_hash,
        hash=block.hash,
        nonce=block.nonce,
    )
    db.add(ledger_block)
    db.commit()
    db.refresh(batch)

    return {
        "batch_id": batch.id,
        "status": batch.status,
        "event": request.event_type,
    }


@app.get("/api/batches/{batch_id}/qr")
def get_batch_qr(
    batch_id: str,
    db: Session = Depends(get_db),
):
    """
    Generate and stream QR code for a batch.
    QR encodes: https://[frontend_url]/verify/[batch_id]
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    verify_url = f"{frontend_url()}/verify/{batch_id}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=2,
    )
    qr.add_data(verify_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img_bytes = BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes.seek(0)

    return StreamingResponse(img_bytes, media_type="image/png")


@app.get("/api/batches/{batch_id}/compliance-report")
def compliance_report(
    batch_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a PDF screening report from persisted batch and ledger data."""
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.beekeeper_id == current_user.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    blocks = db.query(LedgerBlock).filter(LedgerBlock.batch_id == batch_id).order_by(LedgerBlock.index).all()
    purity = ApicultureAnalytics.score_purity(batch.moisture_pct)
    pdf = BytesIO()
    report = canvas.Canvas(pdf, pagesize=A4)
    _, height = A4
    y = height - 48
    lines = [
        "HoneyChain Compliance Screening Report", f"Batch ID: {batch.id}",
        f"Honey type: {batch.honey_type}", f"Quantity: {batch.quantity_kg} kg",
        f"Moisture: {batch.moisture_pct}% | BIS/Codex <=20%: {'COMPLIANT' if purity['moisture_compliant'] else 'NOT COMPLIANT'}",
        f"Purity screening: {purity['status']} ({purity['purity_score']}/100)",
        "Ledger timeline (event | hash):",
    ]
    for block in blocks:
        lines.append(f"#{block.index} {block.event_type} | {block.hash}")
    for line in lines:
        if y < 48:
            report.showPage(); y = height - 48
        report.drawString(42, y, line[:115]); y -= 16
    report.save()
    pdf.seek(0)
    return StreamingResponse(pdf, media_type="application/pdf", headers={
        "Content-Disposition": f'attachment; filename="honeychain-{batch_id}-compliance.pdf"'
    })


# ============================================================================
# Verify Route (Public, No Auth)
# ============================================================================

@app.get("/api/verify/{batch_id}", response_model=VerifyBatchResponse)
def verify_batch(batch_id: str, db: Session = Depends(get_db)):
    """
    Public verification endpoint (no auth required).
    Consumer scans QR and gets full traceability timeline + authenticity badge.
    """
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    beekeeper = db.query(User).filter(User.id == batch.beekeeper_id).first()

    # Get all ledger blocks for this batch
    blocks = db.query(LedgerBlock).filter(LedgerBlock.batch_id == batch_id).order_by(
        LedgerBlock.index
    ).all()

    # Verify ledger integrity
    chain_verification = persisted_ledger(db).verify_chain()
    authenticity_badge = "VERIFIED" if chain_verification["valid"] else "TAMPERED"
    transfer_count = sum(1 for block in blocks if block.event_type == "TRANSFER")

    return VerifyBatchResponse(
        batch_id=batch.id,
        beekeeper_name=beekeeper.name if beekeeper else "Unknown",
        beekeeper_cluster=beekeeper.cluster if beekeeper else None,
        honey_type=batch.honey_type,
        quantity_kg=batch.quantity_kg,
        harvest_date=batch.harvest_date,
        apiary_location=batch.apiary_location,
        moisture_pct=batch.moisture_pct,
        purity_score=batch.purity_score,
        status=batch.status,
        ledger_timeline=[LedgerBlockResponse.from_orm(b) for b in blocks],
        chain_verification=chain_verification,
        authenticity_badge=authenticity_badge,
        transfer_count=transfer_count,
        direct_trade=transfer_count <= 1,
    )


# ============================================================================
# Admin Routes
# ============================================================================

@app.get("/api/admin/overview", response_model=AdminOverviewResponse)
def admin_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregate stats for KVIC cooperative admin view."""
    if current_user.role != "cooperative_admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    total_beekeepers = db.query(func.count(User.id)).filter(User.role == "beekeeper").scalar()
    total_hives = db.query(func.count(Hive.id)).scalar()
    total_batches = db.query(func.count(Batch.id)).scalar()
    total_honey_kg = db.query(func.sum(Batch.quantity_kg)).scalar() or 0

    # Batches by status
    status_breakdown = db.query(Batch.status, func.count(Batch.id)).group_by(Batch.status).all()
    batches_by_status = {status: count for status, count in status_breakdown}

    # Batches by cluster
    cluster_breakdown = db.query(User.cluster, func.count(Batch.id)).join(
        Batch, User.id == Batch.beekeeper_id
    ).filter(User.cluster != None).group_by(User.cluster).all()
    batches_by_cluster = {cluster: count for cluster, count in cluster_breakdown}

    # Average purity
    avg_purity = db.query(func.avg(Batch.purity_score)).scalar() or 0

    # Use each hive's latest actual sensor reading. Hives without readings are
    # deliberately excluded rather than assigned a fabricated health status.
    latest_by_hive = db.query(
        SensorReading.hive_id, func.max(SensorReading.recorded_at).label("recorded_at")
    ).group_by(SensorReading.hive_id).subquery()
    latest_readings = db.query(SensorReading).join(
        latest_by_hive,
        (SensorReading.hive_id == latest_by_hive.c.hive_id)
        & (SensorReading.recorded_at == latest_by_hive.c.recorded_at),
    ).all()
    avg_hive_health_status = {"HEALTHY": 0, "WATCH": 0, "HIGH_RISK": 0}
    for reading in latest_readings:
        diagnosis = ApicultureAnalytics.analyze_hive_health(
            temperature_c=reading.temperature_c,
            humidity_pct=reading.humidity_pct,
            sound_hz=reading.sound_hz,
            weight_kg=reading.weight_kg,
        )
        avg_hive_health_status[diagnosis.status] += 1

    # Ledger integrity
    chain_verification = persisted_ledger(db).verify_chain()

    # Score = 70% average purity + 3 points per batch (capped at 10 batches)
    # minus 10 per integrity error involving a cluster batch, clamped to 0..100.
    # It is computed live; no reputation values are stored or fabricated.
    reputation_leaderboard = []
    clusters = db.query(User.cluster).filter(User.cluster != None).distinct().all()
    for (cluster,) in clusters:
        cluster_batches = db.query(Batch).join(User).filter(User.cluster == cluster).all()
        batch_ids = {batch.id for batch in cluster_batches}
        cluster_blocks = db.query(LedgerBlock).filter(LedgerBlock.batch_id.in_(batch_ids)).all() if batch_ids else []
        tamper_incidents = sum(1 for block in cluster_blocks if block.hash != LedgerBlockModel(
            index=block.index, batch_id=block.batch_id, event_type=block.event_type,
            payload=block.payload, actor=block.actor, timestamp=block.timestamp_str,
            prev_hash=block.prev_hash, nonce=block.nonce, hash=block.hash,
        ).compute_hash())
        average_purity = sum((batch.purity_score or 0) for batch in cluster_batches) / len(cluster_batches) if cluster_batches else 0
        score = max(0, min(100, round(average_purity * 0.7 + min(len(cluster_batches), 10) * 3 - tamper_incidents * 10, 1)))
        reputation_leaderboard.append({
            "cluster": cluster, "batch_count": len(cluster_batches),
            "avg_purity": round(average_purity, 1), "tamper_incidents": tamper_incidents,
            "score": score,
        })
    reputation_leaderboard.sort(key=lambda entry: entry["score"], reverse=True)

    return AdminOverviewResponse(
        total_beekeepers=total_beekeepers,
        total_hives=total_hives,
        total_batches=total_batches,
        total_honey_kg=total_honey_kg,
        batches_by_status=batches_by_status,
        batches_by_cluster=batches_by_cluster,
        avg_purity_score=round(avg_purity, 1),
        avg_hive_health_status=avg_hive_health_status,
        ledger_integrity=chain_verification,
        reputation_leaderboard=reputation_leaderboard,
    )


# ============================================================================
# App Startup
# ============================================================================

@app.on_event("startup")
async def startup():
    """Initialize database on app startup."""
    # Fail before serving traffic if a production secret/domain was omitted.
    required_secret_key()
    frontend_url()
    db_config = get_db_config()
    db_config.init_db()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

