import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from chat_server.exceptions import UsernameAlreadyExists, UserNotFound
from chat_server.schemas.user import UserCreate, UserUpdate
from chat_server.services.user_service import UserService


@pytest.fixture
def svc(session: AsyncSession) -> UserService:
    return UserService(session)


@pytest.fixture
async def user(svc: UserService):
    return await svc.create_user(UserCreate(username="alice", password="Password1"))


class TestCreateUser:
    async def test_creates_user(self, svc: UserService) -> None:
        user = await svc.create_user(UserCreate(username="alice", password="Password1"))
        assert user is not None
        assert user.username == "alice"

    async def test_duplicate_returns_none(self, svc: UserService) -> None:
        await svc.create_user(UserCreate(username="alice", password="Password1"))
        result = await svc.create_user(UserCreate(username="alice", password="Password1"))
        assert result is None


class TestAuthenticateCredentials:
    async def test_valid_credentials(self, svc: UserService, user) -> None:
        result = await svc.authenticate_credentials("alice", "Password1")
        assert result.username == "alice"

    async def test_wrong_password_raises_401(self, svc: UserService, user) -> None:
        with pytest.raises(HTTPException) as exc:
            await svc.authenticate_credentials("alice", "WrongPass1")
        assert exc.value.status_code == 401

    async def test_unknown_user_raises_401(self, svc: UserService) -> None:
        with pytest.raises(HTTPException) as exc:
            await svc.authenticate_credentials("nobody", "Password1")
        assert exc.value.status_code == 401


class TestGetById:
    async def test_returns_user(self, svc: UserService, user) -> None:
        found = await svc.get_by_id(user.id)
        assert found is not None
        assert found.id == user.id

    async def test_returns_none_for_missing(self, svc: UserService) -> None:
        assert await svc.get_by_id(99999) is None


class TestGetPaginated:
    async def test_returns_users(self, svc: UserService) -> None:
        await svc.create_user(UserCreate(username="alice", password="Password1"))
        await svc.create_user(UserCreate(username="bob", password="Password1"))
        result = await svc.get_paginated()
        assert result.total_users == 2

    async def test_search(self, svc: UserService) -> None:
        await svc.create_user(UserCreate(username="alice", password="Password1"))
        await svc.create_user(UserCreate(username="bob", password="Password1"))
        result = await svc.get_paginated(search="ali")
        assert result.total_users == 1


class TestUpdate:
    async def test_updates_username(self, svc: UserService, user) -> None:
        updated = await svc.update(user.id, UserUpdate(username="newname"))
        assert updated.username == "newname"

    async def test_raises_user_not_found(self, svc: UserService) -> None:
        with pytest.raises(UserNotFound):
            await svc.update(99999, UserUpdate(username="nobody"))

    async def test_raises_username_already_exists(self, svc: UserService, user) -> None:
        other = await svc.create_user(UserCreate(username="other", password="Password1"))
        assert other is not None
        with pytest.raises(UsernameAlreadyExists):
            await svc.update(user.id, UserUpdate(username=other.username))


class TestDelete:
    async def test_deletes_user(self, svc: UserService, user) -> None:
        await svc.delete(user.id)
        assert await svc.get_by_id(user.id) is None

    async def test_nonexistent_is_idempotent(self, svc: UserService) -> None:
        await svc.delete(99999)


class TestGetMessages:
    async def test_returns_empty_for_new_user(self, svc: UserService, user) -> None:
        count, messages = await svc.get_messages(user.id)
        assert count == 0
        assert messages == []
