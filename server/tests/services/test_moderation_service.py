import pytest

from chat_server.connection.channel import Channel
from chat_server.connection.user import User
from chat_server.schemas.user import UserCreate
from chat_server.services.mute_service import MuteService
from chat_server.services.user_service import UserService


@pytest.fixture
def svc(session_factory) -> MuteService:
    return MuteService(session_factory)


@pytest.fixture
async def users(session_factory):
    async with session_factory() as s:
        user_svc = UserService(s)
        target = await user_svc.create_user(
            UserCreate(username="target", password="Password1")
        )
        mod = await user_svc.create_user(
            UserCreate(username="mod", password="Password1")
        )
    return target, mod


@pytest.fixture
def channel() -> Channel:
    return Channel(id=1, name="general")


class TestMuteUser:
    async def test_mutes_user(self, svc, users, channel) -> None:
        target, mod = users
        target_conn = User(target.username, target.id)
        mod_conn = User(mod.username, mod.id)
        await svc.mute_user(target_conn, mod_conn, channel)
        assert await svc.is_muted(target_conn, channel) is True

    async def test_mute_with_reason(self, svc, users, channel) -> None:
        target, mod = users
        target_conn = User(target.username, target.id)
        mod_conn = User(mod.username, mod.id)
        await svc.mute_user(target_conn, mod_conn, channel, reason="spamming")
        assert await svc.is_muted(target_conn, channel) is True


class TestUnmuteUser:
    async def test_unmutes_user(self, svc, users, channel) -> None:
        target, mod = users
        target_conn = User(target.username, target.id)
        mod_conn = User(mod.username, mod.id)
        await svc.mute_user(target_conn, mod_conn, channel)
        await svc.unmute_user(target_conn, channel)
        assert await svc.is_muted(target_conn, channel) is False

    async def test_unmute_nonexistent_is_idempotent(self, svc, users, channel) -> None:
        target, _ = users
        target_conn = User(target.username, target.id)
        await svc.unmute_user(target_conn, channel)  # must not raise


class TestIsMuted:
    async def test_returns_false_when_not_muted(self, svc, users, channel) -> None:
        target, _ = users
        target_conn = User(target.username, target.id)
        assert await svc.is_muted(target_conn, channel) is False

    async def test_scoped_to_channel(self, svc, users, channel) -> None:
        target, mod = users
        target_conn = User(target.username, target.id)
        mod_conn = User(mod.username, mod.id)
        await svc.mute_user(target_conn, mod_conn, channel)
        other_channel = Channel(id=2, name="other")
        assert await svc.is_muted(target_conn, other_channel) is False
