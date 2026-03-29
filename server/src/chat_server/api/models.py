from datetime import datetime
import re
from typing import Annotated

from pydantic import BaseModel, Field, field_validator
from pydantic.config import ConfigDict
from pydantic.types import StringConstraints

from chat_server.db.models import USERNAME_MAX_LENGTH


def _validate_password_strength(v: str) -> str:
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one digit")
    return v


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: Annotated[
        str, StringConstraints(True, min_length=3, max_length=USERNAME_MAX_LENGTH)
    ]
    password: str = Field(min_length=8, max_length=30)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class UserUpdate(BaseModel):
    username: (
        Annotated[
            str, StringConstraints(True, min_length=3, max_length=USERNAME_MAX_LENGTH)
        ]
        | None
    ) = None
    password: str | None = Field(min_length=8, max_length=30, default=None)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if v:
            _validate_password_strength(v)
        return v


class UserPublic(OrmModel):
    id: int
    username: str
    is_guest: bool
    created_at: datetime


class UsersPublic(BaseModel):
    total_users: int
    total_pages: int
    users: list[UserPublic]


class MessagePublic(OrmModel):
    channel_id: int
    sender_username: str
    timestamp: datetime
    content: str


class MessagesPublic(BaseModel):
    count: int
    messages: list[MessagePublic]


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenContent(BaseModel):
    sub: str | None = None


class Channel(OrmModel):
    id: int


class ChannelsStats(BaseModel):
    count: int
    channels: list[Channel]


class ChannelMember(OrmModel):
    id: int
    username: str
    is_guest: bool


class ChannelMembers(BaseModel):
    count: int
    users: list[ChannelMember]
