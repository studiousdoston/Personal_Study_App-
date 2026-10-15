from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers import auth

app = FastAPI(title='Study App API')
# create the application

app.include_router(auth.router)

# register a GET route 
@app.get('/health')
def health_check(db: Session = Depends(get_db)):
  db.execute(text("Select 1"))
  return {"status": "ok", "database":"connected successfully"}