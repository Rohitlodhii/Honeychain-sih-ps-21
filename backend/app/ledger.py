"""
HoneyChain Ledger Module
Real, from-scratch hash-chained ledger for traceability events.
Permissioned/private-ledger design suited to KVIC cooperative consortium.
"""

import hashlib
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict


@dataclass
class LedgerBlock:
    """Immutable block in the honey traceability chain."""
    index: int
    batch_id: str
    event_type: str  # HARVEST, QUALITY_TEST, TRANSFER, PACKAGE, SALE
    payload: Dict[str, Any]
    actor: str  # beekeeper_id, cooperative_id, etc.
    timestamp: str  # ISO 8601
    prev_hash: str
    nonce: int
    hash: Optional[str] = None

    def compute_hash(self) -> str:
        """
        Compute SHA-256 hash of this block.
        Hash includes all fields except the hash itself and nonce (nonce is found via proof-of-work).
        """
        data = {
            "index": self.index,
            "batch_id": self.batch_id,
            "event_type": self.event_type,
            "payload": self.payload,
            "actor": self.actor,
            "timestamp": self.timestamp,
            "prev_hash": self.prev_hash,
            "nonce": self.nonce,
        }
        data_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(data_str.encode()).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        """Convert block to dictionary for storage/display."""
        return asdict(self)


class HoneyLedger:
    """
    Private/permissioned ledger for honey batch traceability.
    
    Design rationale:
    - This is NOT a public blockchain. It's a tamper-evident audit log for a KVIC cooperative.
    - Participants (beekeepers, QA labs, retailers) are known and trusted at the network level.
    - The ledger prevents post-hoc tampering: modifying any historical event re-breaks the chain.
    - Tiny proof-of-work (2 leading zero hex chars) proves intent without heavyweight consensus.
    - Verification is local/instant — no consensus rounds, no gas fees, no external dependency.
    """

    def __init__(self):
        self.blocks: List[LedgerBlock] = []
        self._init_genesis()

    def _init_genesis(self):
        """Create the genesis (first) block."""
        genesis = LedgerBlock(
            index=0,
            batch_id="genesis",
            event_type="SYSTEM_INIT",
            payload={"description": "HoneyChain Ledger Genesis"},
            actor="system",
            timestamp=datetime.utcnow().isoformat() + "Z",
            prev_hash="0",
            nonce=0,
        )
        genesis.hash = self._find_proof_of_work(genesis)
        self.blocks.append(genesis)

    def _find_proof_of_work(self, block: LedgerBlock, difficulty: int = 2) -> str:
        """
        Simple proof-of-work: find a nonce such that the block's hash starts with `difficulty` zeros.
        difficulty=2 means 2 leading zero hex chars (very fast, ~0.1-1ms on modern hardware).
        """
        while True:
            block.nonce += 1
            candidate_hash = block.compute_hash()
            if candidate_hash.startswith("0" * difficulty):
                return candidate_hash

    def append_event(
        self,
        batch_id: str,
        event_type: str,
        payload: Dict[str, Any],
        actor: str,
    ) -> LedgerBlock:
        """
        Append a new traceability event to the ledger.
        Returns the new block.
        """
        prev_block = self.blocks[-1]
        # Indexes must advance from the previous persisted block.  Using
        # ``len`` breaks a ledger reconstructed without its transient genesis
        # block after an application restart.
        new_index = prev_block.index + 1
        new_block = LedgerBlock(
            index=new_index,
            batch_id=batch_id,
            event_type=event_type,
            payload=payload,
            actor=actor,
            timestamp=datetime.utcnow().isoformat() + "Z",
            prev_hash=prev_block.hash,
            nonce=0,
        )
        new_block.hash = self._find_proof_of_work(new_block)
        self.blocks.append(new_block)
        return new_block

    def get_batch_timeline(self, batch_id: str) -> List[LedgerBlock]:
        """Retrieve all blocks for a given batch."""
        return [b for b in self.blocks if b.batch_id == batch_id]

    def verify_chain(self) -> Dict[str, Any]:
        """
        Verify integrity of the entire ledger.
        Returns a report: {valid: bool, first_tampering_at_index: Optional[int], errors: List[str]}
        """
        errors = []
        first_tampering = None

        for i, block in enumerate(self.blocks):
            # Recompute this block's hash
            computed_hash = block.compute_hash()
            if computed_hash != block.hash:
                if first_tampering is None:
                    first_tampering = i
                errors.append(
                    f"Block {i} (batch_id={block.batch_id}): hash mismatch. "
                    f"Expected {block.hash}, computed {computed_hash}"
                )

            # Check linkage to previous block
            if i > 0:
                prev_block = self.blocks[i - 1]
                if block.prev_hash != prev_block.hash:
                    if first_tampering is None:
                        first_tampering = i
                    errors.append(
                        f"Block {i} (batch_id={block.batch_id}): prev_hash mismatch. "
                        f"Expected {prev_block.hash}, got {block.prev_hash}"
                    )

        return {
            "valid": len(errors) == 0,
            "first_tampering_at_index": first_tampering,
            "errors": errors,
            "total_blocks": len(self.blocks),
        }

    def to_dict(self) -> Dict[str, Any]:
        """Serialize entire ledger."""
        return {
            "blocks": [b.to_dict() for b in self.blocks],
        }

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "HoneyLedger":
        """Deserialize ledger from dictionary."""
        ledger = HoneyLedger()
        ledger.blocks = []  # Clear genesis

        for block_data in data.get("blocks", []):
            block = LedgerBlock(
                index=block_data["index"],
                batch_id=block_data["batch_id"],
                event_type=block_data["event_type"],
                payload=block_data["payload"],
                actor=block_data["actor"],
                timestamp=block_data["timestamp"],
                prev_hash=block_data["prev_hash"],
                nonce=block_data["nonce"],
                hash=block_data.get("hash"),
            )
            ledger.blocks.append(block)

        return ledger

