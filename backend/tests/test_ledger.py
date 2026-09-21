from app.ledger import HoneyLedger
from app.database import DatabaseConfig
from app.main import persisted_ledger
from app.models import LedgerBlock


def test_hash_chain_verifies_after_append():
    ledger = HoneyLedger()
    ledger.append_event("batch-1", "HARVEST", {"quantity_kg": 12}, "beekeeper-1")
    ledger.append_event("batch-1", "PACKAGE", {"jar_count": 24}, "beekeeper-1")
    assert ledger.verify_chain()["valid"] is True


def test_tampered_payload_is_detected():
    ledger = HoneyLedger()
    block = ledger.append_event("batch-1", "HARVEST", {"quantity_kg": 12}, "beekeeper-1")
    block.payload["quantity_kg"] = 99
    report = ledger.verify_chain()
    assert report["valid"] is False
    assert report["first_tampering_at_index"] == 1


def test_persisted_ledger_is_verified_after_reconstruction(tmp_path):
    """Simulates a process restart by opening a fresh DB session."""
    config = DatabaseConfig(f"sqlite:///{tmp_path / 'ledger.db'}")
    config.init_db()
    session = config.get_session()
    block = persisted_ledger(session).append_event(
        "batch-1", "HARVEST", {"quantity_kg": 12}, "beekeeper-1"
    )
    session.add(LedgerBlock(
        id="block-1", index=block.index, batch_id="batch-1",
        event_type=block.event_type, payload=block.payload, actor=block.actor,
        timestamp_str=block.timestamp, prev_hash=block.prev_hash,
        hash=block.hash, nonce=block.nonce,
    ))
    session.commit()
    session.close()

    restarted_session = config.get_session()
    report = persisted_ledger(restarted_session).verify_chain()
    restarted_session.close()
    assert report["valid"] is True
    assert report["total_blocks"] == 1
