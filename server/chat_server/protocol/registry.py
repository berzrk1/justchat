import logging
from typing import TypeVar
from chat_server.protocol.basemessage import BaseMessage
from chat_server.protocol.enums import MessageType


class MessageRegistry:
    def __init__(self) -> None:
        self._messages: dict[MessageType, type[BaseMessage]] = {}

    def register(self, message_type: MessageType, message_class: type[BaseMessage]):
        """
        Register a new message type.

        Args:
            message_type: The message type enum value.
            message_class: The Pydantic message class.
        """
        if message_type in self._messages:
            raise ValueError(f"Message type {message_type} already registered")

        self._messages[message_type] = message_class

        logging.debug(f"Registered {repr(message_type)} -> {repr(message_class)}")

    def parse(self, json_str: str) -> BaseMessage | None:
        """
        Parse JSON String into appropriate message object and returns it.

        Returns None if invalid message type.
        """
        import json

        data = json.loads(json_str)
        message_type = data.get("type")

        if message_type not in self._messages:
            return None

        message_class = self._messages[message_type]
        return message_class.model_validate_json(json_str)


message_reg = MessageRegistry()


T = TypeVar("T", bound=BaseMessage)


def register_message(message_type: MessageType):
    """
    Decorator to register a message type.
    """

    def decorator(cls: type[T]) -> type[T]:
        message_reg.register(message_type, cls)
        return cls

    return decorator
