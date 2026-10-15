import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import User
from app.models import RefreshToken
from app.security import hash_password, verify_password, password_needs_rehash, generate_refresh_token, hash_refresh_token
from app.config import settings


# Used when the email doesn't exist, so a failed login always takes the same time
_DUMMY_PASSWORD_HASH = hash_password("dummy-password-for-timing")


class EmailAlreadyRegisteredError(Exception):
    pass


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def signup(db: Session, email: str, password: str) -> User:
    if get_user_by_email(db, email) is not None:
        raise EmailAlreadyRegisteredError()

    user = User(email=email, password_hash=hash_password(password))
    db.add(user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise EmailAlreadyRegisteredError() from None
    db.refresh(user)
    return user


def login(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if user is None:
        verify_password(password, _DUMMY_PASSWORD_HASH)
        return None

    if not verify_password(password, user.password_hash):
        return None

    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
        db.commit()

    return user

def create_refresh_token(db: Session, user_id: uuid.UUID) -> str:
    raw_token = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=hash_refresh_token(raw_token),
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    db.commit()
    return raw_token