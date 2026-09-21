"""
HoneyChain Authentication Module
JWT token management and password hashing.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from .models import User
from .config import required_secret_key, admin_invite_code
import uuid

# Configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Authentication and JWT token management."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt."""
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against a bcrypt hash."""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def create_access_token(
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, required_secret_key(), algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def decode_token(token: str) -> Optional[Dict[str, Any]]:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(token, required_secret_key(), algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id is None:
                return None
            return payload
        except JWTError:
            return None

    @staticmethod
    def register_user(
        db: Session,
        name: str,
        phone: str,
        password: str,
        role: str,
        cluster: Optional[str] = None,
        email: Optional[str] = None,
        admin_invite_code_value: Optional[str] = None,
    ) -> User:
        """Register a new user."""
        if role == "cooperative_admin":
            configured_code = admin_invite_code()
            if not configured_code or admin_invite_code_value != configured_code:
                raise ValueError("A valid cooperative-admin invite code is required")

        # Check if user already exists
        existing = db.query(User).filter(User.phone == phone).first()
        if existing:
            raise ValueError("Phone number already registered")

        user = User(
            id=str(uuid.uuid4()),
            name=name,
            phone=phone,
            email=email,
            role=role,
            cluster=cluster,
            hashed_password=AuthService.hash_password(password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def authenticate_user(
        db: Session,
        phone: str,
        password: str,
    ) -> Optional[User]:
        """Authenticate user by phone and password."""
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            return None
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def get_user_from_token(db: Session, token: str) -> Optional[User]:
        """Retrieve user from a valid JWT token."""
        payload = AuthService.decode_token(token)
        if payload is None:
            return None
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(User).filter(User.id == user_id).first()
        return user

