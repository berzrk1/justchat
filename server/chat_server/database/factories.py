"""Factories that works similar to FastAPI's DI, but usable in websocket

Should be used to inject the services into chat protocols
"""

import logging

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from chat_server.database.core import async_session
from chat_server.database.repositories.messages import MessageRepository
from chat_server.database.repositories.mute import MuteRepository
from chat_server.database.repositories.react import ReactRepository
from chat_server.services.mute_service import MuteService


@asynccontextmanager
async def mute_srvc_factory() -> AsyncGenerator[MuteService, None]:
    """
    Mute Service Factory

    Example:
    async with mute_srvc_factory() as srvc:
        srvc.mute()
        ...
    """
    async with async_session() as session:
        try:
            yield MuteService(MuteRepository(session))
            await session.commit()
        except Exception as e:
            logging.error(f"Database Rollback: {e}")
            await session.rollback()
        finally:
            await session.close()


@asynccontextmanager
async def messages_repo_factory() -> AsyncGenerator[MessageRepository, None]:
    """
    Messages Repository Factory
    """
    async with async_session() as session:
        try:
            yield MessageRepository(session)
            await session.commit()
        except Exception as e:
            logging.error(f"Database Rollback: {e}")
            await session.rollback()
        finally:
            await session.close()


@asynccontextmanager
async def react_repo_factory() -> AsyncGenerator[ReactRepository, None]:
    """
    React Repository Factory
    """
    async with async_session() as session:
        try:
            yield ReactRepository(session)
            await session.commit()
        except Exception as e:
            logging.error(f"Database Rollback: {e}")
            await session.rollback()
        finally:
            await session.close()
