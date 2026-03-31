"""Factories that works similar to FastAPI's DI, but usable in websocket

Should be used to inject the services into chat protocols
"""

from chat_server.database.repositories.mute import MuteRepository
from chat_server.services.mute_service import MuteService
from chat_server.database.core import async_session
from contextlib import asynccontextmanager


@asynccontextmanager
async def mute_srvc_factory():
    """
    Mute Service Factory

    Example:
    async with mute_srvc_factory() as srvc:
        srvc.mute()
        ...
    """
    async with async_session() as session:
        yield MuteService(MuteRepository(session))
