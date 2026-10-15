from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserOut
from app.security import create_access_token, hash_password
from app.services import auth_service
from app.dependencies import CurrentUser

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"

def _set_refresh_cookie(response: Response, token: str) -> None:
  response.set_cookie(
    key = REFRESH_COOKIE_NAME,
    value=token,
    max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
    httponly=True,
    secure=settings.cookie_secure,
    samesite='lax',
    path='/auth'
  )

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
  try:
    return auth_service.signup(db, payload.email, payload.password)
  except auth_service.EmailAlreadyRegisteredError:
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT, detail="Email is already registered"
    ) from None


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = auth_service.login(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    refresh_token = auth_service.create_refresh_token(db, user.id)
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=create_access_token(user.id))

@router.get("/me", response_model=UserOut)
def read_me(current_user: CurrentUser):
    return current_user