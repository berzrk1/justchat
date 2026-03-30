import re
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, field_validator

from chat_server.schemas.base import OrmModel
from chat_server.settings import settings


def _validate_password_strength(v: str) -> str:
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one digit")
    return v


class UserCreate(BaseModel):
    username: Annotated[
        str,
        StringConstraints(True, min_length=3, max_length=settings.USERNAME_MAX_LENGTH),
    ]
    password: str = Field(min_length=8, max_length=30)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class UserUpdate(BaseModel):
    username: (
        Annotated[
            str,
            StringConstraints(
                True, min_length=3, max_length=settings.USERNAME_MAX_LENGTH
            ),
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
