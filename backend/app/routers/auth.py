from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.auth import RegisterRequest
from app.schemas.user import UserOut
from app.security import hash_password
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
  try:
    return auth_service.register_user(db, payload.email, payload.password)
  except auth_service.EmailAlreadyRegisteredError:
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT, detail="Email is already registered"
    ) from None