import uuid
from datetime import datetime
from typing import List, Optional

import sqlalchemy as sa
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


from app.db.base import Base
from app.db import *


class DeploymentRequest(Base):
    __tablename__ = "deployment_requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending_assignment', 'assigned', 'quoted', 'in_progress', 'live_confirmed', 'canceled')",
            name="check_deployment_request_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("versions.id"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending_assignment", server_default="pending_assignment"
    )
    assigned_developer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    chat_room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, server_default=func.gen_random_uuid(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    project: Mapped["Project"] = relationship("Project", back_populates="deployment_requests")
    version: Mapped["Version"] = relationship("Version", back_populates="deployment_requests")
    assigned_developer: Mapped[Optional["User"]] = relationship("User")
    quotes: Mapped[List["Quote"]] = relationship("Quote", back_populates="deployment_request", cascade="all, delete-orphan")


class Quote(Base):
    __tablename__ = "quotes"
    __table_args__ = (
        CheckConstraint(
            "status IN ('submitted', 'accepted', 'rejected', 'expired')",
            name="check_quote_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deployment_requests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD", server_default="USD")
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="submitted", server_default="submitted"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    deployment_request: Mapped["DeploymentRequest"] = relationship("DeploymentRequest", back_populates="quotes")
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="quote")


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('held', 'released', 'refunded')",
            name="check_payment_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    quote_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("quotes.id"), nullable=False, index=True
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    gateway_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="held", server_default="held"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    quote: Mapped["Quote"] = relationship("Quote", back_populates="payments")
    ledger_entries: Mapped[List["LedgerEntry"]] = relationship("LedgerEntry", back_populates="payment")


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    __table_args__ = (
        CheckConstraint(
            "account_type IN ('user_escrow', 'escrow_holding', 'platform_commission', 'developer_payable')",
            name="check_ledger_account_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    payment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True, index=True
    )
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    debit_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    credit_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    reference_memo: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    payment: Mapped[Optional["Payment"]] = relationship("Payment", back_populates="ledger_entries")


class PayoutPeriod(Base):
    __tablename__ = "payout_periods"
    __table_args__ = (
        CheckConstraint("status IN ('open', 'processing', 'closed')", name="check_payout_period_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    period_month: Mapped[str] = mapped_column(String(7), nullable=False)  # e.g. '2026-11'
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="open", server_default="open")

    payouts: Mapped[List["Payout"]] = relationship("Payout", back_populates="period")


class Payout(Base):
    __tablename__ = "payouts"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'paid', 'failed')", name="check_payout_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    period_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payout_periods.id"), nullable=False, index=True
    )
    developer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    total_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending", server_default="pending"
    )
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    period: Mapped["PayoutPeriod"] = relationship("PayoutPeriod", back_populates="payouts")
    developer: Mapped["User"] = relationship("User")
