from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://terminal_user:terminal_pass@postgres:5432/terminal_db"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class CommandHistory(Base):
    __tablename__ = "command_history"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), nullable=False, index=True)  # Session identifier for user isolation
    command = Column(String(500), nullable=False)
    output = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def save_command_history(session_id: str, command: str, output: str):
    """Save command to history for a specific session"""
    db = SessionLocal()
    try:
        history_entry = CommandHistory(
            session_id=session_id,
            command=command,
            output=output,
            timestamp=datetime.utcnow()
        )
        db.add(history_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def get_command_history(session_id: str, limit: int = 50):
    """Get command history for a specific session"""
    db = SessionLocal()
    try:
        history = db.query(CommandHistory)\
            .filter(CommandHistory.session_id == session_id)\
            .order_by(CommandHistory.timestamp.desc())\
            .limit(limit).all()
        return [
            {
                "id": h.id,
                "command": h.command,
                "output": h.output,
                "timestamp": h.timestamp.isoformat()
            }
            for h in reversed(history)
        ]
    finally:
        db.close()

