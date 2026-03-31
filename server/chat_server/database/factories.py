"""Factories that works similar to FastAPI's DI, but usable in websocket

Should be used to inject the services into chat protocols
"""

from chat_server.database.repositories.moderation import ModerationRepository
from chat_server.services.moderation_service import ModerationService
from chat_server.database.core import async_session
from contextlib import asynccontextmanager


@asynccontextmanager
async def moderation_srvc_factory():
    """
    Moderation Service Factory

    Example:
    async with moderation_srvc_factory() as srvc:
        srvc.mute()
        ...
    """
    async with async_session() as session:
        yield ModerationService(ModerationRepository(session))
