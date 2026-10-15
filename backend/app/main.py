from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers import auth, cards, decks, quiz, reviews, stats

app = FastAPI(title='Study App API')
# create the application

app.include_router(auth.router)
app.include_router(decks.router)
app.include_router(cards.router)
app.include_router(reviews.router)
app.include_router(quiz.router)
app.include_router(stats.router)

# register a GET route 
@app.get('/health')
def health_check(db: Session = Depends(get_db)):
  db.execute(text("Select 1"))
  return {"status": "ok", "database":"connected successfully"}