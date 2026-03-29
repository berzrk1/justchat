from fastapi import WebSocket
from pydantic import BaseModel

from chat_server.connection.user import User


class ConnectionContext(BaseModel):
    model_config = {"arbitrary_types_allowed": True}

    websocket: WebSocket
    user: User
