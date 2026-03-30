import logging

from chat_server.connection.context import ConnectionContext
from chat_server.connection.manager import ConnectionManager
from chat_server.handler import channel_handler, chat_handler, commands_handler
from chat_server.protocol.basemessage import BaseMessage
from chat_server.protocol.enums import MessageType


HANDLERS = {
    # Channel
    MessageType.CHANNEL_JOIN: channel_handler.handler_channel_join,
    MessageType.CHANNEL_LEAVE: channel_handler.handler_channel_leave,
    # Chat
    MessageType.CHAT_SEND: chat_handler.handler_chat_send,
    MessageType.REACT_ADD: chat_handler.handler_chat_react,
    MessageType.REACT_REMOVE: chat_handler.handler_chat_react,
    MessageType.TYPING_START: chat_handler.handler_chat_typing,
    # Chat Commands
    MessageType.CHAT_KICK: commands_handler.handler_kick,
    MessageType.CHAT_MUTE: commands_handler.handler_mute,
    MessageType.CHAT_UNMUTE: commands_handler.handler_unmute,
}


async def dispatch(
    ctx: ConnectionContext, message: BaseMessage, manager: ConnectionManager
):
    """
    Route a Message to its appropriate Handler
    """

    handler = HANDLERS.get(message.type)
    logging.debug(
        f"This handler was invoked: {handler.__name__ if handler else 'Unknown Handler'} "
    )

    if handler is None:
        # TODO: Return a message error or some exception. It will never happen
        # here since there is a verification check in manager.handle_message()
        logging.debug(f"Unknown Message Type: {message.type}. Payload: {message}")
        return

    await handler(ctx, message, manager)
