from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import ForeignKey, func, Unicode
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import Boolean, DateTime, Integer, String
from chat_server.settings import settings


class Base(DeclarativeBase):
    pass


class UserTable(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(
        String(settings.USERNAME_MAX_LENGTH), unique=True
    )
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    is_guest: Mapped[bool] = mapped_column(Boolean, default=False)

    reactions: Mapped[list["ReactTable"]] = relationship(back_populates="sender")


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
        String(settings.USERNAME_MAX_LENGTH), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime)
    content: Mapped[str] = mapped_column(String)
    reactions: Mapped[list["ReactTable"]] = relationship(back_populates="message")


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


class ReactTable(Base):
    __tablename__ = "reactions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    message_id: Mapped[UUID] = mapped_column(ForeignKey("messages.id"))
    message: Mapped[MessageTable] = relationship(back_populates="reactions")
    emote: Mapped[str] = mapped_column(Unicode)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    sender: Mapped[UserTable] = relationship(back_populates="reactions")

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self.id=}{self.message_id=}{self.emote=}{self.sender_id=})"
