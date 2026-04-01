import logging
import uuid
from datetime import datetime

from chat_server.connection.channel import Channel
from chat_server.connection.context import ConnectionContext
from chat_server.handler.decorators import (
    require_channel,
    require_membership,
    require_not_muted,
)
from chat_server.infrastructure.manager import ConnectionManager
from chat_server.protocol.basemessage import BaseMessage
from chat_server.protocol.enums import MessageType
from chat_server.protocol.messages import (
    ChatSend,
    ReactAdd,
    ReactPayload,
    ReactRemove,
    TypingStart,
    TypingStartPayload,
)


@require_channel
@require_membership
@require_not_muted
async def handler_chat_send(
    ctx: ConnectionContext,
    message: BaseMessage,
    manager: ConnectionManager,
    *,
    msg_in,
    channel: Channel,
) -> None:
    """
    Handle an incoming message of the type ChatSend
    """
    try:
        await manager.channel_srvc.chat_send(ctx.user, channel, msg_in.payload.content)
        logging.info(f"Message sent to channel {repr(channel)} by {repr(ctx.user)}")
    except Exception as e:
        logging.error(f"Error handling CHAT_SEND: {e}")
        await manager.send_error(ctx.websocket, "Failed to send message")


@require_channel
@require_membership
async def handler_chat_react(
    ctx: ConnectionContext,
    message: BaseMessage,
    manager: ConnectionManager,
    *,
    msg_in,
    channel: Channel,
):
    """
    Handles add/remove reactions to messages
    """
    # FIX: Does this message even exist ? How to check
    # if the message_id exists?
    # Also, how to block the user from sending many react add ?
    payload = ReactPayload(
        emote=msg_in.payload.emote,
        message_id=msg_in.payload.message_id,
        channel_id=channel.id,
    )

    if msg_in.type is MessageType.REACT_ADD:
        response = ReactAdd(timestamp=datetime.now(), id=uuid.uuid4(), payload=payload)
    else:
        response = ReactRemove(
            timestamp=datetime.now(), id=uuid.uuid4(), payload=payload
        )

    await manager.channel_srvc.send_to_channel(channel, response)


@require_channel
@require_membership
@require_not_muted
async def handler_chat_typing(
    ctx: ConnectionContext,
    message: BaseMessage,
    manager: ConnectionManager,
    *,
    msg_in,
    channel: Channel,
):
    """
    Handles typing start message
    """
    logging.debug(f"{msg_in = }")

    response_payload = TypingStartPayload(channel_id=channel.id, user=ctx.user)
    response = TypingStart(
        timestamp=datetime.now(), id=uuid.uuid4(), payload=response_payload
    )
    await manager.channel_srvc.send_to_channel(channel, response)
