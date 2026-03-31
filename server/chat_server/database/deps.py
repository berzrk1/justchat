"""Dependecies usable in FastAPI Routers"""

from chat_server.database.repositories.moderation import ModerationRepository
from chat_server.services.moderation_service import ModerationService
from chat_server.database.core import DBSession
from fastapi import Depends
from typing import Annotated


def get_moderation_service(session: DBSession) -> ModerationService:
    repository = ModerationRepository(session)
    return ModerationService(repository)


ModerationSrvcDeps = Annotated[ModerationService, Depends(get_moderation_service)]
