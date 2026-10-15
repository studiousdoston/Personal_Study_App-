from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

app = FastAPI(title='Study App API')
# create the application

# register a GET route 
@app.get('/health')
def health_check(db: Session = Depends(get_db)):
  db.execute(text("Select 1"))
  return {"status": "ok", "database":"connected successfully"}