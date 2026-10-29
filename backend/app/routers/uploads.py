from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import CurrentUser
from app.schemas.upload import UploadOut
from app.services import upload_service

router = APIRouter(tags=["uploads"])


##########################################################
#!                       ROUTES
##########################################################
@router.post("/uploads", response_model=UploadOut, status_code=status.HTTP_201_CREATED)
def upload_image(
    current_user: CurrentUser,
    file: UploadFile = File(),
    db: Session = Depends(get_db),
):
    data = file.file.read(settings.upload_max_bytes + 1)
    try:
        return upload_service.upload_image(db, current_user.id, data)
    except upload_service.UploadTooLargeError:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="File is too large"
        ) from None
    except upload_service.UnsupportedImageError:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG, WEBP and HEIC images are allowed",
        ) from None
