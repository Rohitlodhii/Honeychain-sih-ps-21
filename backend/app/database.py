"""
HoneyChain Database Configuration
SQLAlchemy session management and database initialization.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
import os
from .models import Base


class DatabaseConfig:
    """Database connection configuration."""

    def __init__(self, database_url: str = None):
        """
        Initialize database config.
        
        Args:
            database_url: Full connection string (e.g., "sqlite:///honey.db" or "postgresql://...")
        """
        self.database_url = database_url or os.getenv(
            "DATABASE_URL",
            "sqlite:///./honey.db"
        )
        # For SQLite, ensure check_same_thread is False for async compatibility
        if "sqlite" in self.database_url:
            self.engine = create_engine(
                self.database_url,
                connect_args={"check_same_thread": False},
            )
        else:
            self.engine = create_engine(self.database_url, echo=False)

        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

    def init_db(self):
        """Create all tables."""
        Base.metadata.create_all(bind=self.engine)

    def get_session(self) -> Session:
        """Get a new database session."""
        return self.SessionLocal()

    @contextmanager
    def session_context(self):
        """Context manager for session lifecycle."""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


# Global database instance (initialized at app startup)
db_config = None


def get_db_config() -> DatabaseConfig:
    """Get the global database config instance."""
    global db_config
    if db_config is None:
        db_config = DatabaseConfig()
    return db_config


def get_db() -> Session:
    """Dependency injection for FastAPI."""
    config = get_db_config()
    session = config.get_session()
    try:
        yield session
    finally:
        session.close()

