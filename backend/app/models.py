"""
HoneyChain Database Models
SQLAlchemy ORM models for users, hives, sensor readings, batches, and ledger.
"""

from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, ForeignKey, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class User(Base):
    """Beekeeper or cooperative admin."""
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=True)
    role = Column(String, nullable=False)  # "beekeeper" or "cooperative_admin"
    cluster = Column(String, nullable=True)  # District/cluster name for aggregation
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    hives = relationship("Hive", back_populates="beekeeper", cascade="all, delete-orphan")
    batches = relationship("Batch", back_populates="beekeeper", cascade="all, delete-orphan")


class Hive(Base):
    """Individual hive metadata."""
    __tablename__ = "hives"

    id = Column(String, primary_key=True)
    beekeeper_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    species = Column(String, nullable=False)  # "apis_mellifera", "apis_cerana", etc.
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    beekeeper = relationship("User", back_populates="hives")
    sensor_readings = relationship("SensorReading", back_populates="hive", cascade="all, delete-orphan")
    batches = relationship("Batch", back_populates="hive", cascade="all, delete-orphan")


class SensorReading(Base):
    """IoT sensor data from hive."""
    __tablename__ = "sensor_readings"

    id = Column(String, primary_key=True)
    hive_id = Column(String, ForeignKey("hives.id"), nullable=False)
    temperature_c = Column(Float, nullable=False)
    humidity_pct = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    sound_hz = Column(Float, nullable=True)
    recorded_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    hive = relationship("Hive", back_populates="sensor_readings")


class Batch(Base):
    """Honey batch (harvest from hive)."""
    __tablename__ = "batches"

    id = Column(String, primary_key=True)
    beekeeper_id = Column(String, ForeignKey("users.id"), nullable=False)
    hive_id = Column(String, ForeignKey("hives.id"), nullable=False)
    honey_type = Column(String, nullable=False)  # "wildflower", "acacia", etc.
    quantity_kg = Column(Float, nullable=False)
    harvest_date = Column(DateTime, nullable=False)
    apiary_location = Column(String, nullable=False)
    moisture_pct = Column(Float, nullable=True)
    purity_score = Column(Float, nullable=True)  # 0-100 from analytics
    status = Column(String, default="HARVESTED")  # HARVESTED, QUALITY_TEST, PACKAGED, SOLD
    current_owner = Column(String, nullable=False)  # beekeeper_id initially
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    beekeeper = relationship("User", back_populates="batches")
    hive = relationship("Hive", back_populates="batches")
    ledger_blocks = relationship("LedgerBlock", back_populates="batch", cascade="all, delete-orphan")


class LedgerBlock(Base):
    """Blockchain-style ledger entry for traceability."""
    __tablename__ = "ledger_blocks"

    id = Column(String, primary_key=True)
    index = Column(Integer, nullable=False)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    event_type = Column(String, nullable=False)  # HARVEST, QUALITY_TEST, TRANSFER, PACKAGE, SALE
    payload = Column(JSON, nullable=False)  # Event-specific data
    actor = Column(String, nullable=False)  # Who initiated the event (user_id)
    timestamp_str = Column(String, nullable=False)  # ISO 8601 timestamp
    prev_hash = Column(String, nullable=False)
    hash = Column(String, nullable=False, unique=True, index=True)
    nonce = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    batch = relationship("Batch", back_populates="ledger_blocks")

