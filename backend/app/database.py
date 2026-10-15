from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True )
# manages a pool of connection to db (created once)

SessionLocal = sessionmaker(bind=engine, autoflush=False)
# create session with db (queries, adds, commits)

class Base(DeclarativeBase):
  pass
# The parent class every model will inherit from (User, Deck, Card)

def get_db():
  db = SessionLocal()
  try: 
    yield db

  finally: 
    db.close()
# gives each web request its own session and closes it afterwards 