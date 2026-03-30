from pydantic import BaseModel

from chat_server.schemas.base import OrmModel


class Channel(OrmModel):
    id: int


class ChannelsStats(BaseModel):
    count: int
    channels: list[Channel]


class ChannelMember(OrmModel):
    id: int
    username: str
    is_guest: bool


class ChannelMembers(BaseModel):
    count: int
    users: list[ChannelMember]
