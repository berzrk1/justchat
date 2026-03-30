from fastapi import APIRouter, Depends, HTTPException, status
from chat_server.api.deps import DashbordSrvc, get_current_user
from chat_server.schemas.channel import ChannelMembers, ChannelsStats
from chat_server.exceptions import ChannelDoesntExist


router = APIRouter(prefix="/channels", tags=["dashboard-channels"])


@router.get("/active", dependencies=[Depends(get_current_user)])
def active_channels(dashboard_srvc: DashbordSrvc) -> ChannelsStats:
    """
    Endpoint to retrieve all active channels.
    """
    ch = dashboard_srvc.get_active_channels()
    return ChannelsStats(count=len(ch), channels=ch)  # type: ignore


@router.get(
    "/members/{ch_id}",
    response_model=ChannelMembers,
    dependencies=[Depends(get_current_user)],
)
def get_channel_members(dashboard_srvc: DashbordSrvc, ch_id: int):
    try:
        members = dashboard_srvc.get_channel_members(ch_id)
        return ChannelMembers(count=len(members), users=members)  # type: ignore
    except ChannelDoesntExist:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Channel doesn't exist")
