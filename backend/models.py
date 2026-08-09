from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    tenant_id: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        index=True,
        default=lambda: str(uuid4()),
    )
    firebase_project_id: Mapped[str | None] = mapped_column(
    String(100),
    nullable=True,
    )

    firebase_provisioning_status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
    )

    firebase_provisioned_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )
    business_name: Mapped[str] = mapped_column(String(200))
    legal_business_name: Mapped[str] = mapped_column(String(250))
    business_type: Mapped[str] = mapped_column(String(50))
    country: Mapped[str] = mapped_column(String(100))

    business_email: Mapped[str] = mapped_column(String(255))
    business_phone: Mapped[str] = mapped_column(String(30))

    owner_name: Mapped[str] = mapped_column(String(200))
    owner_email: Mapped[str] = mapped_column(String(255))
    owner_phone: Mapped[str] = mapped_column(String(30))
    owner_role: Mapped[str] = mapped_column(String(50))

    pan: Mapped[str] = mapped_column(String(10))
    gstin: Mapped[str | None] = mapped_column(
        String(15),
        nullable=True,
    )

    plan: Mapped[str] = mapped_column(String(50))
    billing_cycle: Mapped[str] = mapped_column(String(30))
    subscription_status: Mapped[str] = mapped_column(String(30))
    start_date: Mapped[str] = mapped_column(String(20))

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )