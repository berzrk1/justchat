import logging
import uuid
from datetime import datetime

from chat_server.connection.context import ConnectionContext
from chat_server.database.factories import messages_repo_factory
from chat_server.handler.decorators import require_membership, require_not_muted
from chat_server.infrastructure.manager import ConnectionManager
from chat_server.protocol.messages import (
    ChatSend,
    ReactAdd,
    TypingStart,
    TypingStartPayload,
    UserFrom,
)

logger = logging.getLogger(__name__)


@require_membership
@require_not_muted
async def handler_chat_send(
    ctx: ConnectionContext,
    message: ChatSend,
    manager: ConnectionManager,
) -> None:
    """
    Handle an chat send message
    """
    try:
        channel = manager.channel_srvc.get_channel_by_id(message.payload.channel_id)
        if not channel:
            return

        await manager.channel_srvc.chat_send(ctx.user, channel, message.payload.content)
        logger.info(f"Message sent from {repr(ctx.user)} to {repr(channel)}")
    except Exception as e:
        logger.error(
            f"Error sending message from {repr(ctx.user)} to {repr(channel)}: {e}"
        )
        await manager.send_error(ctx.websocket, "Failed to send message")


@require_membership
async def handler_chat_react(
    ctx: ConnectionContext,
    message: ReactAdd,
    manager: ConnectionManager,
):
    """
    Handles reaction message
    """
    try:
        channel = manager.channel_srvc.get_channel_by_id(message.payload.channel_id)
        if not channel:
            return

        # Check if message exists and it belongs to the current channel
        async with messages_repo_factory() as msg_repo:
            message_db = await msg_repo.get_by_id(message.payload.message_id)
            if not (message_db and message_db.channel_id == channel.id):
                await manager.send_error(
                    ctx.websocket, "You can't react to this message"
                )
                return

        await manager.channel_srvc.react_chat(
            ctx.user, message.payload.message_id, channel, message.payload.emote
        )
    except Exception as e:
        logger.error(f"Error react {repr(ctx.user)} to {repr(channel)}: {e}")
        await manager.send_error(ctx.websocket, "Failed to react to message")


@require_membership
@require_not_muted
async def handler_chat_typing(
    ctx: ConnectionContext,
    message: TypingStart,
    manager: ConnectionManager,
):
    """
    Handles typing indicator message
    """
    try:
        channel = manager.channel_srvc.get_channel_by_id(message.payload.channel_id)
        if not channel:
            return

        response_payload = TypingStartPayload(
            channel_id=channel.id, user=UserFrom.model_validate(ctx.user)
        )
        response = TypingStart(
            timestamp=datetime.now(), id=uuid.uuid4(), payload=response_payload
        )
        await manager.channel_srvc.send_to_channel(channel, response)
    except Exception as e:
        logger.error(f"Error typing indicator {repr(ctx.user)} in {repr(channel)}: {e}")
