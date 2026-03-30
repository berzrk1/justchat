from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from passlib.hash import argon2

from chat_server.settings import settings

ALGORITHM = "HS256"


def get_password_hash(password: str):
    hash = argon2.hash(password)
    return hash


def verify_password_hash(plain_password: str, hashed_password: str) -> bool:
    return argon2.verify(plain_password, hashed_password)


def generate_access_token(subject: str | Any, expires_delta: timedelta):
    """
    Utility to generate new JWT Tokens
    """
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"sub": str(subject), "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, ALGORITHM)
    return encoded_jwt
