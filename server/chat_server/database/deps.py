"""Dependecies usable in FastAPI Routers"""

from chat_server.database.repositories.mute import MuteRepository
from chat_server.services.mute_service import MuteService
from chat_server.database.core import DBSession
from fastapi import Depends
from typing import Annotated


def get_mute_service(session: DBSession) -> MuteService:
    repository = MuteRepository(session)
    return MuteService(repository)


MuteSrvcDeps = Annotated[MuteService, Depends(get_mute_service)]
