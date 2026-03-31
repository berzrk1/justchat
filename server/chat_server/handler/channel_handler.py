import logging

from chat_server.connection.channel import Channel
from chat_server.connection.context import ConnectionContext
from chat_server.infrastructure.manager import ConnectionManager
from chat_server.handler.decorators import (
    require_channel,
    require_membership,
    validate_message,
)
from chat_server.protocol.basemessage import BaseMessage
from chat_server.protocol.messages import (
    ChannelJoin,
    ChannelLeave,
)

logger = logging.getLogger(__name__)


@validate_message(ChannelJoin)
async def handler_channel_join(
    ctx: ConnectionContext,
    message: BaseMessage,
    manager: ConnectionManager,
    msg_in,
) -> None:
    """
    Handle incoming message from Channel Join
    """
    channel_response = Channel(
        id=msg_in.payload.channel_id, name=f"Channel {msg_in.payload.channel_id}"
    )

    try:
        await manager.channel_srvc.join_channel(ctx.user, channel_response)
        logging.info(f"{repr(ctx.user)} joined {repr(channel_response)}")
    except Exception as e:
        logging.info(f"Error adding {repr(ctx.user)} to {repr(channel_response)}: {e}")
        await manager.send_error(ctx.websocket, "Error trying to join the channel.")


@validate_message(ChannelLeave)
@require_channel
@require_membership
async def handler_channel_leave(
    ctx: ConnectionContext,
    message: BaseMessage,
    manager: ConnectionManager,
    *,
    msg_in,
    channel: Channel,
) -> None:
    """
    Handle Channel Leave
    """
    try:
        await manager.channel_srvc.leave_channel(ctx.user, channel)
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        await manager.send_error(ctx.websocket, "Unexpeted error. Try again.")
