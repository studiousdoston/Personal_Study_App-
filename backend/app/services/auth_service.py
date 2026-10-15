from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import User
from app.security import hash_password

class EmailAlreadyRegisteredError(Exception):
    pass


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def register_user(db: Session, email: str, password: str) -> User:
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