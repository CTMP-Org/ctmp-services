import os
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Integer, DateTime, ForeignKey, Table
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

def _read_secret_file(path: str) -> str | None:
    try:
        with open(path, "r", encoding="utf-8") as secret_file:
            value = secret_file.read().strip()
            return value or None
    except FileNotFoundError:
        return None

DATABASE_URL = (
    os.environ.get("DATABASE_URL")
    or os.environ.get("PG_CONNECTION_STRING")
    or _read_secret_file("/mnt/secrets/pg-connection-string")
)

if not DATABASE_URL:
    raise ValueError("DATABASE_URL, PG_CONNECTION_STRING, or /mnt/secrets/pg-connection-string is required")

if os.environ.get("USE_ENTRA_DB_AUTH", "").lower() == "true":
    from azure.identity import DefaultAzureCredential
    from urllib.parse import urlparse
    import psycopg2
    import time
    
    parsed = urlparse(DATABASE_URL)
    db_host = parsed.hostname
    db_name = parsed.path.lstrip("/")
    db_port = parsed.port or 5432
    db_user = os.environ.get("DB_USER") or parsed.username or "ctmp3-workload-identity"
    
    credential = DefaultAzureCredential()
    _cached_db_token = None
    _cached_db_token_expires_at = 0.0
    
    def get_conn():
        global _cached_db_token, _cached_db_token_expires_at
        now = time.time()
        if not _cached_db_token or _cached_db_token_expires_at - now < 300:
            token_obj = credential.get_token("https://ossrdbms-aad.database.windows.net/.default")
            _cached_db_token = token_obj.token
            _cached_db_token_expires_at = token_obj.expires_on
            
        return psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=_cached_db_token,
            sslmode="require"
        )
    
    engine = create_engine("postgresql+psycopg2://", creator=get_conn, pool_pre_ping=True)
else:
    if "sslmode" not in DATABASE_URL:
        if "?" in DATABASE_URL:
            DATABASE_URL += "&sslmode=require"
        else:
            DATABASE_URL += "?sslmode=require"
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


user_group_association = Table(
    "user_group_association",
    Base.metadata,
    Column("user_id", String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("group_id", String, ForeignKey("training_groups.id", ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    name = Column(String)
    role = Column(String, nullable=False)

    groups = relationship("TrainingGroup", secondary=user_group_association, back_populates="students")

class TrainingGroup(Base):
    __tablename__ = "training_groups"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    trainer_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    aws_account_id = Column(String)
    aws_region = Column(String, default="us-east-1")
    created_at = Column(DateTime, default=datetime.utcnow)

    trainer = relationship("User", foreign_keys=[trainer_id])
    students = relationship("User", secondary=user_group_association, back_populates="groups")
    instances = relationship("EC2Instance", back_populates="group", cascade="all, delete-orphan")

class EC2Instance(Base):
    __tablename__ = "ec2_instances"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    state = Column(String, default="stopped")
    instance_type = Column(String, default="t3.micro")
    launch_time = Column(DateTime, default=datetime.utcnow)
    group_id = Column(String, ForeignKey("training_groups.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    accumulated_running_hours = Column(Float, default=0.0)
    accumulated_stopped_hours = Column(Float, default=0.0)
    last_state_change_time = Column(DateTime, default=datetime.utcnow)

    group = relationship("TrainingGroup", back_populates="instances")
    student = relationship("User")

