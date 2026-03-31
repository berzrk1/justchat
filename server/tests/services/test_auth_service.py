from datetime import timedelta
from unittest.mock import patch

import pytest

from chat_server.schemas.user import UserCreate
from chat_server.security.utils import generate_access_token
from chat_server.services.authorization_service import AuthenticationError, AuthenticationService
from chat_server.services.user_service import UserService


@pytest.fixture
def svc(session_factory) -> AuthenticationService:
    return AuthenticationService(session_factory)


@pytest.fixture
async def registered_user(session_factory):
    async with session_factory() as s:
        return await UserService(s).create_user(
            UserCreate(username="testuser", password="Password1")
        )


class TestAuthenticateWithToken:
    async def test_valid_token_returns_user(self, svc, registered_user) -> None:
        token = generate_access_token(registered_user.id, timedelta(minutes=5))
        user = await svc.authenticate(token)
        assert user.id == registered_user.id
        assert user.username == registered_user.username

    async def test_invalid_token_raises(self, svc) -> None:
        with pytest.raises(AuthenticationError):
            await svc.authenticate("not.a.valid.token")

    async def test_token_for_missing_user_raises(self, svc) -> None:
        token = generate_access_token(99999, timedelta(minutes=5))
        with pytest.raises(AuthenticationError):
            await svc.authenticate(token)


class TestAuthenticateGuest:
    async def test_none_token_creates_guest(self, svc) -> None:
        user = await svc.authenticate(None)
        assert user.is_guest is True
        assert user.username.startswith("Guest")

    async def test_guest_is_persisted(self, svc, session_factory) -> None:
        user = await svc.authenticate(None)
        async with session_factory() as s:
            from chat_server.database.repositories.users import UserRepository
            db_user = await UserRepository(s).get_by_id(user.id)
        assert db_user is not None
        assert db_user.is_guest is True
