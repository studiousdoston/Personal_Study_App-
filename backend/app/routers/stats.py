from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import CurrentUser
from app.schemas.stats import StatsOut
from app.services import stats_service

router = APIRouter(tags=["stats"])


##########################################################
#!                       ERRORS
##########################################################
def _unknown_timezone() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown time zone"
    )


##########################################################
#!                       ROUTES
##########################################################
@router.get("/stats", response_model=StatsOut)
def get_stats(
    current_user: CurrentUser,
    tz: str = "UTC",
    db: Session = Depends(get_db),
):
    try:
        return stats_service.get_stats(db, current_user.id, tz)
    except stats_service.InvalidTimezoneError:
        raise _unknown_timezone() from None
