from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from chat_server.database.repositories.messages import MessageRepository
from chat_server.database.repositories.users import UserRepository
from chat_server.schemas.user import UserCreate


@pytest.fixture
def repo(session: AsyncSession) -> MessageRepository:
    return MessageRepository(session)


@pytest.fixture
async def sender(session: AsyncSession):
    user_repo = UserRepository(session)
    return await user_repo.create(UserCreate(username="sender", password="Password1"))


def _ts(offset_minutes: int = 0) -> datetime:
    """Return a naive UTC datetime with an optional minute offset."""
    base = datetime(2024, 1, 1, 12, 0, 0)
    return base + timedelta(minutes=offset_minutes)


class TestCreate:
    async def test_creates_message(self, repo: MessageRepository, sender) -> None:
        msg = await repo.create(
            id=uuid4(),
            channel_id=1,
            sender_id=sender.id,
            sender_username=sender.username,
            content="hello",
            timestamp=_ts(),
        )
        assert msg is not None
        assert msg.content == "hello"
        assert msg.sender_id == sender.id
        assert msg.channel_id == 1

    async def test_stores_provided_id(self, repo: MessageRepository, sender) -> None:
        msg_id = uuid4()
        msg = await repo.create(
            id=msg_id,
            channel_id=1,
            sender_id=sender.id,
            sender_username=sender.username,
            content="hi",
            timestamp=_ts(),
        )
        assert msg.id == msg_id


class TestGetByChannel:
    async def test_returns_messages_for_channel(self, repo: MessageRepository, sender) -> None:
        for i in range(3):
            await repo.create(
                id=uuid4(),
                channel_id=1,
                sender_id=sender.id,
                sender_username=sender.username,
                content=f"msg{i}",
                timestamp=_ts(i),
            )
        messages = await repo.get_by_channel(channel_id=1)
        assert len(messages) == 3

    async def test_excludes_other_channels(self, repo: MessageRepository, sender) -> None:
        await repo.create(
            id=uuid4(), channel_id=1, sender_id=sender.id,
            sender_username=sender.username, content="ch1", timestamp=_ts(0),
        )
        await repo.create(
            id=uuid4(), channel_id=2, sender_id=sender.id,
            sender_username=sender.username, content="ch2", timestamp=_ts(1),
        )
        messages = await repo.get_by_channel(channel_id=1)
        assert len(messages) == 1
        assert messages[0].content == "ch1"

    async def test_respects_limit(self, repo: MessageRepository, sender) -> None:
        for i in range(10):
            await repo.create(
                id=uuid4(), channel_id=1, sender_id=sender.id,
                sender_username=sender.username, content=f"msg{i}", timestamp=_ts(i),
            )
        messages = await repo.get_by_channel(channel_id=1, limit=5)
        assert len(messages) == 5

    async def test_returns_empty_for_unknown_channel(self, repo: MessageRepository) -> None:
        messages = await repo.get_by_channel(channel_id=999)
        assert messages == []

    async def test_ordered_by_timestamp_ascending(self, repo: MessageRepository, sender) -> None:
        for i in range(3):
            await repo.create(
                id=uuid4(), channel_id=1, sender_id=sender.id,
                sender_username=sender.username, content=f"msg{i}", timestamp=_ts(i),
            )
        messages = await repo.get_by_channel(channel_id=1)
        timestamps = [m.timestamp for m in messages]
        assert timestamps == sorted(timestamps)

    async def test_cursor_pagination_before_id(self, repo: MessageRepository, sender) -> None:
        ids = []
        for i in range(5):
            msg = await repo.create(
                id=uuid4(), channel_id=1, sender_id=sender.id,
                sender_username=sender.username, content=f"msg{i}", timestamp=_ts(i),
            )
            ids.append(msg.id)

        # before_id = ids[2] (msg2 at _ts(2)) → should return msg0 and msg1
        messages = await repo.get_by_channel(channel_id=1, before_id=ids[2])
        assert len(messages) == 2
        contents = {m.content for m in messages}
        assert contents == {"msg0", "msg1"}

    async def test_before_id_on_first_message_returns_empty(
        self, repo: MessageRepository, sender
    ) -> None:
        ids = []
        for i in range(3):
            msg = await repo.create(
                id=uuid4(), channel_id=1, sender_id=sender.id,
                sender_username=sender.username, content=f"msg{i}", timestamp=_ts(i),
            )
            ids.append(msg.id)

        messages = await repo.get_by_channel(channel_id=1, before_id=ids[0])
        assert messages == []
