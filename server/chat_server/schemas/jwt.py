from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenContent(BaseModel):
    sub: int | None = None  # User ID
