from sqlalchemy.sql import select
import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from chat_server.database.models import ReactTable

logger = logging.getLogger(__name__)


class ReactRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(
        self, message_id: uuid.UUID, sender_id: int, emote: str
    ) -> ReactTable | None:
        """Store a reaction to the database"""
        try:
            obj = ReactTable(message_id=message_id, sender_id=sender_id, emote=emote)
            self._session.add(obj)
            await self._session.commit()
            await self._session.refresh(obj)
            logger.debug(f"Created new {obj}")
            return obj
        except Exception as e:
            logger.error("Failed to store reaction in database: ", e)
            raise

    async def get(self, message_id: uuid.UUID, sender_id: int) -> ReactTable | None:
        """
        Get a reaction if it already exists for that message from that sender
        """
        st = select(ReactTable).where(
            ReactTable.message_id == message_id, ReactTable.sender_id == sender_id
        )
        res = await self._session.execute(st)
        return res.scalar_one_or_none()

    async def delete(self, instance: ReactTable):
        await self._session.delete(instance)
        logger.debug("Deleted ReactTable")
