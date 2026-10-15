import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.config import settings

_hasher = PasswordHasher()

# ---------- Passwords ----------


def hash_password(password:str) -> str:
  return _hasher.hash(password)

def verify_password(password:str, password_hash: str) -> bool:
  try:
    return _hasher.verify(password_hash, password)
  except:
    (VerificationError, InvalidHashError)
    return False

def password_needs_rehash(password_hash: str) -> bool:
  return _hasher.check_needs_rehash(password_hash)


# ---------- Access tokens (JWT) ----------

def create_access_token(user_id: uuid.UUID) -> str:
  now = datetime.now(timezone.utc)
  payload = {
    "sub": str(user_id),
    "type": "access",
    "iat": now,
    "exp": now + timedelta(minutes=settings.access_token_expires_minutes)
  }
  return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token:str) -> uuid.UUID | None:
  try:
    payload = jwt.decode(
      token,
      settings.jwt_secret_key,
      algorithms=[settings.jwt_algorithm],
      options={"require":["sub", "exp", "iat"]}
    )
  except jwt.PyJWTError:
    return None

  if payload.get("type") != "access":
    return None
  try:
    return uuid.UUID(payload["sub"])
  except ValueError:
    return None


# ---------- Refresh tokens (random, stored hashed) ----------

def generate_refresh_token() -> str:
  return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
  return hashlib.sha256(token.encode()).hexdigest()