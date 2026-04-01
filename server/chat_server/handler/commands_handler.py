from chat_server.database.factories import mute_srvc_factory
import logging
from datetime import datetime
from uuid import uuid4

from chat_server.connection.context import ConnectionContext
from chat_server.infrastructure.manager import ConnectionManager
from chat_server.handler.decorators import (
    require_channel,
    require_membership,
    require_permission,
)
from chat_server.protocol.messages import (
    KickCommand,
    MuteCommand,
    MuteCommandPayload,
    UnMuteCommand,
    UnMuteCommandPayload,
)

logger = logging.getLogger(__name__)


@require_membership
@require_permission("kick")
async def handler_kick(
    ctx: ConnectionContext,
    message: KickCommand,
    manager: ConnectionManager,
):
    """
    Handle kick command
    """
    try:
        channel = manager.channel_srvc.get_channel_by_id(message.payload.channel_id)
        if not channel:
            return

        target = manager.channel_srvc.find_member_by_username(
            message.payload.channel_id, message.payload.target
        )

        if target:
            payload = message.payload
            kick_msg = KickCommand(
                timestamp=datetime.now(), id=uuid4(), payload=payload
            )
            await manager.channel_srvc.send_to_channel(channel, kick_msg)
            await manager.channel_srvc.leave_channel(target, channel)
            logger.info(f"{repr(ctx.user)} kicked {repr(target)} in {repr(channel)}")
    except Exception as e:
        logger.error(
            f"Error when {repr(ctx.user)} kicked {repr(target)} in {repr(channel)}: {e}"
        )
        await manager.send_error(ctx.websocket, "Failed to kick user")


@require_membership
@require_permission("mute")
async def handler_mute(
    ctx: ConnectionContext,
    message: MuteCommand,
    manager: ConnectionManager,
):
    """
    Handle mute command
    """
    try:
        channel = manager.channel_srvc.get_channel_by_id(message.payload.channel_id)
        if not channel:
            return

        payload = message.payload
        target = manager.channel_srvc.find_member_by_username(
            payload.channel_id, payload.target
        )

        if target:
            async with mute_srvc_factory() as srvc:
                await srvc.mute_user(
                    target=target,
                    issuer=ctx.user,
                    channel=channel,
                    duration=payload.duration,
                    reason=payload.reason,
                )
                server_payload = MuteCommandPayload(
                    channel_id=channel.id,
                    target=target.username,
                    duration=payload.duration,
                    reason=payload.reason,
                )

                server_rsp = MuteCommand(
                    timestamp=datetime.now(), id=uuid4(), payload=server_payload
                )

                await manager.channel_srvc.send_to_channel(channel, server_rsp)
                logger.info(f"{repr(ctx.user)} muted {repr(target)} in {repr(channel)}")

    except Exception as e:
        logger.error(
            f"Error when {repr(ctx.user)} muted {repr(target)} in {repr(channel)}: {e}"
        )
        await manager.send_error(ctx.websocket, "Failed to mute user")


@require_channel
@require_membership
@require_permission("mute")
async def handler_unmute(
    ctx: ConnectionContext,
    message: UnMuteCommand,
    manager: ConnectionManager,
):
    """
    Handle unmute command
    """
    try:
        channel = manager.channel_srvc.get_channel_by_id(message.payload.channel_id)
        if not channel:
            return

        payload = message.payload
        target = manager.channel_srvc.find_member_by_username(
            payload.channel_id, payload.target
        )

        if target:
            async with mute_srvc_factory() as srvc:
                await srvc.unmute_user(target, channel)
                logger.info(f"{repr(ctx.user)} is unmuting {target}.")

                server_payload = UnMuteCommandPayload(
                    channel_id=channel.id,
                    target=target.username,
                )

                server_rsp = UnMuteCommand(
                    timestamp=datetime.now(), id=uuid4(), payload=server_payload
                )

                await manager.channel_srvc.send_to_channel(channel, server_rsp)
                logger.info(
                    f"{repr(ctx.user)} unmuted {repr(target)} in {repr(channel)}"
                )

    except Exception as e:
        logger.error(
            f"Error when {repr(ctx.user)} unmuted {repr(target)} in {repr(channel)}: {e}"
        )
        await manager.send_error(ctx.websocket, "Failed to unmute user")
