from datetime import datetime

from pydantic import BaseModel

from chat_server.schemas.base import OrmModel


class MessagePublic(OrmModel):
    channel_id: int
    sender_username: str
    timestamp: datetime
    content: str


class MessagesPublic(BaseModel):
    count: int
    messages: list[MessagePublic]
