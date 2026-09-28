import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.engine import URL

load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")
DB_PASSWORD = os.getenv("DB_PASSWORD")

if DB_PASSWORD:
    # Production: Cloud Run -> Cloud SQL
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_NAME = os.getenv("DB_NAME", "abhinava")
    DB_SOCKET = os.getenv(
        "DB_SOCKET",
        "/cloudsql/abhinava-origin:asia-south1:abhinava-postgres",
    )

    database_url = URL.create(
        drivername="postgresql+psycopg",
        username=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        query={"host": DB_SOCKET},
    )
else:
    # Local development
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")

    database_url = DATABASE_URL


engine = create_engine(database_url)


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()