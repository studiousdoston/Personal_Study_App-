import uuid
from datetime import datetime, timedelta, timezone
from typing import NamedTuple

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.models import RefreshToken, User
from app.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    password_needs_rehash,
    verify_password,
)

# Used when the email doesn't exist, so a failed login always takes the same time
_DUMMY_PASSWORD_HASH = hash_password("dummy-password-for-timing")


##########################################################
#                        ERRORS
##########################################################
class EmailAlreadyRegisteredError(Exception):
    pass

class InvalidCredentialsError(Exception):
    pass

class InvalidRefreshTokenError(Exception):
    pass

class AuthTokens(NamedTuple):
    access_token: str
    refresh_token: str

##########################################################
#                       PUBLIC
##########################################################
def register(db: Session, email: str, password: str) -> User:
    if _get_user_by_email(db, email) is not None:
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


def login(db: Session, email: str, password: str) -> AuthTokens:
    user = _get_user_by_email(db, email)
    if user is None:
        verify_password(password, _DUMMY_PASSWORD_HASH)
        raise InvalidCredentialsError()

    if not verify_password(password, user.password_hash):
        raise InvalidCredentialsError()

    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)

    return _issue_tokens(db, user.id)


def refresh(db: Session, raw_refresh_token: str) -> AuthTokens:
    now = datetime.now(timezone.utc)
    stored = db.scalar(
        select(RefreshToken)
        .where(RefreshToken.token_hash == hash_refresh_token(raw_refresh_token))
        .with_for_update()
    )
    if stored is None:
        raise InvalidRefreshTokenError()

    if stored.revoked_at is not None:
        db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == stored.user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        db.commit()
        raise InvalidRefreshTokenError()

    if stored.expires_at <= now:
        raise InvalidRefreshTokenError()

    stored.revoked_at = now
    return _issue_tokens(db, stored.user_id)


def logout(db: Session, raw_refresh_token: str | None) -> None:
    if raw_refresh_token is None:
        return

    stored = db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_refresh_token(raw_refresh_token)
        )
    )
    if stored is not None and stored.revoked_at is None:
        stored.revoked_at = datetime.now(timezone.utc)
        db.commit()


##########################################################
#                    PRIVATE HELPERS
##########################################################
def _get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def _issue_tokens(db: Session, user_id: uuid.UUID) -> AuthTokens:
    raw_refresh_token = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=hash_refresh_token(raw_refresh_token),
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    db.commit()
    return AuthTokens(
        access_token=create_access_token(user_id),
        refresh_token=raw_refresh_token,
    )