from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import Boolean, DateTime, Integer, String

USERNAME_MAX_LENGTH = 30


class Base(DeclarativeBase):
    pass


class UserTable(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(USERNAME_MAX_LENGTH), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    is_guest: Mapped[bool] = mapped_column(Boolean, default=False)


class ChannelTable(Base):
    __tablename__ = "channels"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60))


class MessageTable(Base):
    __tablename__ = "messages"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    channel_id: Mapped[int] = mapped_column(Integer)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    sender_username: Mapped[str] = mapped_column(
        String(USERNAME_MAX_LENGTH), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime)
    content: Mapped[str] = mapped_column(String)


class MuteTable(Base):
    __tablename__ = "mutes"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    target_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    reason: Mapped[str] = mapped_column(String(255), nullable=True)
    # channel_id: Mapped[int] = mapped_column(ForeignKey("channels.id"))
    channel_id: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
