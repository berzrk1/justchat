import logging

from fastapi import Depends, HTTPException, status
from fastapi.routing import APIRouter

from chat_server.api.deps import get_current_user
from chat_server.database import crud
from chat_server.database.core import DBSession
from chat_server.exceptions import UsernameAlreadyExists, UserNotFound
from chat_server.schemas.message import MessagesPublic
from chat_server.schemas.user import (
    UserPublic,
    UsersPublic,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["dashboard-users"])


@router.get("/", response_model=UsersPublic, dependencies=[Depends(get_current_user)])
async def list_users(
    session: DBSession,
    page: int = 1,
    page_size: int = 10,
    registered_only: bool = False,
    search: str | None = None,
):
    """
    Get a list of users
    """
    return await crud.get_users_paginated(
        session, page, page_size, registered_only, search
    )


@router.get(
    "/{user_id}", response_model=UserPublic, dependencies=[Depends(get_current_user)]
)
async def get_user(session: DBSession, user_id: int):
    """
    Get user details
    """

    user = await crud.get_user_by_id(session, user_id)

    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


@router.get(
    "/{user_id}/messages",
    response_model=MessagesPublic,
    dependencies=[Depends(get_current_user)],
)
async def get_user_messages(
    session: DBSession, user_id: int, offset: int = 0, limit: int = 10
):
    """
    Get all messages sent by an user
    """
    user = await crud.get_user_by_id(session, user_id)

    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    count, messages = await crud.get_user_messages(session, user_id, offset, limit)

    return MessagesPublic(count=count, messages=messages)  # type: ignore


@router.patch(
    "/{user_id}",
    response_model=UserPublic,
    dependencies=[Depends(get_current_user)],
)
async def update_user(session: DBSession, user_id: int, user_in: UserUpdate):
    """
    Update user details
    """
    try:
        user = await crud.update_user(session, user_id, user_in)
        if not user:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
        return user
    except UserNotFound:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    except UsernameAlreadyExists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Username in use")
    except Exception as e:
        logging.debug(f"Unexpected error: {e}")
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "An internal server error occurred. Try again.",
        )


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_user)],
)
async def delete_user(session: DBSession, user_id: int):
    """
    Delete user
    """
    await crud.delete_user_by_id(session, user_id)
