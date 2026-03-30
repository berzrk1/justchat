from datetime import datetime
from typing import Any
from pydantic import UUID4, BaseModel


class BaseMessage(BaseModel):
    """
    Base Message Class containg absolute necessary information.
    """

    type: Any
    timestamp: datetime | None = None
    id: UUID4 | None = None
    payload: Any

    @classmethod
    def from_json(cls, json_str: str) -> "BaseMessage | None":
        """
        Deserialize a JSON to message object.
        """
        from .registry import message_reg

        return message_reg.parse(json_str)
