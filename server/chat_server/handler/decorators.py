from chat_server.infrastructure.manager import ConnectionManager
from chat_server.protocol.basemessage import BaseMessage
from chat_server.connection.context import ConnectionContext
from chat_server.database.factories import mute_srvc_factory
import logging
from functools import wraps

log = logging.getLogger(__name__)


# def validate_message(message_class: Type[BaseMessage]):
#     """
#     Decorator to valide if the message is the correct type.
#     """
#
#     logging.debug("[[ validate_message decorator ]]")
#
#     def decorator(handler):
#         @wraps(handler)
#         async def wrapper(ctx, message, manager, **kwargs):
#             try:
#                 msg = message_class.model_validate(message)
#             except ValidationError:
#                 await manager.send_error(ctx.websocket, "Malformed message.")
#                 logging.info(f"User sent malformed message: {message}")
#                 return
#             return await handler(ctx, message, manager, msg_in=msg, **kwargs)
#
#         return wrapper
#
#     return decorator


def require_channel(handler):
    """
    Check if channel exists.
    """

    @wraps(handler)
    async def wrapper(
        ctx: ConnectionContext, message: BaseMessage, manager: ConnectionManager
    ):
        channel = manager.channel_srvc.get_channel_by_id(message.payload.channel_id)
        if channel is None:
            await manager.send_error(ctx.websocket, "Channel does not exist.")
            return
        return await handler(ctx, message, manager)

    return wrapper


def require_membership(handler):
    """
    Check if the user is in the channel
    """

    @wraps(handler)
    async def wrapper(ctx, message, manager, *, msg_in, channel, **kwargs):
        if not manager.channel_srvc.is_member(ctx.user, channel):
            await manager.send_error(ctx.websocket, "You must join this channel first")
            return
        return await handler(
            ctx, message, manager, msg_in=msg_in, channel=channel, **kwargs
        )

    return wrapper


def require_permission(permission: str):
    """
    Check for permission
    """

    def decorator(handler):
        @wraps(handler)
        async def wrapper(ctx, message, manager, *, channel, **kwargs):
            # TODO: Implement permission checking
            if ctx.user.is_guest:
                await manager.send_error(
                    ctx.websocket, "You don't have permission to run this command."
                )
                return

            logging.warning(f"Permission check '{permission}' - allowing {ctx.user}")
            return await handler(ctx, message, manager, channel=channel, **kwargs)

        return wrapper

    return decorator


def require_not_muted(handler):
    """
    Ensure the user is not muted in the channel
    """

    @wraps(handler)
    async def wrapper(ctx, message, manager, *, msg_in, channel, **kwargs):
        async with mute_srvc_factory() as srvc:
            if await srvc.is_muted(ctx.user, channel):
                await manager.send_error(
                    ctx.websocket, "You are muted in this channel."
                )
                return
            return await handler(
                ctx, message, manager, msg_in=msg_in, channel=channel, **kwargs
            )

    return wrapper
