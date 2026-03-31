from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from chat_server.connection.channel import Channel
from chat_server.connection.user import User
from chat_server.infrastructure.channel_manager import ChannelManager
from chat_server.schemas.user import UserCreate
from chat_server.services.channel_service import ChannelService
from chat_server.services.membership_service import MembershipService
from chat_server.services.message_broker import MessageBroker
from chat_server.services.user_service import UserService


@pytest.fixture
def broker() -> AsyncMock:
    return AsyncMock(spec=MessageBroker)


@pytest.fixture
def svc(session_factory, broker) -> ChannelService:
    return ChannelService(ChannelManager(), MembershipService(), broker, session_factory)


@pytest.fixture
def channel() -> Channel:
    return Channel(id=1, name="general")


@pytest.fixture
async def sender(session_factory):
    async with session_factory() as s:
        return await UserService(s).create_user(
            UserCreate(username="sender", password="Password1")
        )


class TestGetHistory:
    async def test_returns_empty_for_new_channel(self, svc, channel) -> None:
        messages = await svc.get_history(channel.id)
        assert messages == []

    async def test_returns_persisted_messages(self, svc, channel, sender, session_factory) -> None:
        from chat_server.database.repositories.messages import MessageRepository

        async with session_factory() as s:
            await MessageRepository(s).create(
                id=uuid4(),
                channel_id=channel.id,
                sender_id=sender.id,
                sender_username=sender.username,
                content="hello",
                timestamp=datetime(2024, 1, 1, 12, 0, 0),
            )

        messages = await svc.get_history(channel.id)
        assert len(messages) == 1
        assert messages[0].content == "hello"


class TestPersistAndBroadcast:
    async def test_calls_broker(self, svc, channel, sender, broker) -> None:
        from chat_server.protocol.messages import ChatSend, ChatSendPayload, UserFrom

        svc.create_channel(channel)
        user_conn = User(sender.username, sender.id)
        svc._membershipsrvc.join(user_conn, channel)

        payload = ChatSendPayload(
            channel_id=channel.id,
            sender=UserFrom(username=sender.username),
            content="hi",
        )
        msg = ChatSend(timestamp=datetime.now(), id=uuid4(), payload=payload)

        await svc.persist_and_broadcast(channel, msg)

        broker.send_to_channel.assert_called_once()

    async def test_saves_to_db(self, svc, channel, sender, session_factory) -> None:
        from chat_server.protocol.messages import ChatSend, ChatSendPayload, UserFrom

        svc.create_channel(channel)

        payload = ChatSendPayload(
            channel_id=channel.id,
            sender=UserFrom(username=sender.username),
            content="persisted",
        )
        msg = ChatSend(timestamp=datetime.now(), id=uuid4(), payload=payload)

        await svc.persist_and_broadcast(channel, msg)

        messages = await svc.get_history(channel.id)
        assert len(messages) == 1
        assert messages[0].content == "persisted"
