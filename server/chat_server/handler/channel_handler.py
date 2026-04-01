import logging

from chat_server.connection.channel import Channel
from chat_server.connection.context import ConnectionContext
from chat_server.infrastructure.manager import ConnectionManager
from chat_server.handler.decorators import (
    require_channel,
    require_membership,
)
from chat_server.protocol.messages import (
    ChannelJoin,
    ChannelLeave,
)

logger = logging.getLogger(__name__)


async def handler_channel_join(
    ctx: ConnectionContext,
    message: ChannelJoin,
    manager: ConnectionManager,
):
    """
    Handle Channel Join message
    """
    try:
        channel = Channel(
            id=message.payload.channel_id, name=f"Channel {message.payload.channel_id}"
        )
        await manager.channel_srvc.join_channel(ctx.user, channel)
        logging.info(f"{repr(ctx.user)} joined {repr(channel)}")
    except Exception as e:
        logging.error(f"Error adding {repr(ctx.user)} to {repr(channel)}: {e}")
        await manager.send_error(ctx.websocket, "Error trying to join the channel.")


@require_channel
@require_membership
async def handler_channel_leave(
    ctx: ConnectionContext,
    message: ChannelLeave,
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
