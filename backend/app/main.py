from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.middleware import UploadSizeLimit
from app.routers import auth, cards, decks, generations, quiz, reviews, stats, uploads

app = FastAPI(title='BrainMaxx API')
app.add_middleware(UploadSizeLimit, path="/uploads")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(decks.router)
app.include_router(cards.router)
app.include_router(reviews.router)
app.include_router(quiz.router)
app.include_router(stats.router)
app.include_router(generations.router)
app.include_router(uploads.router)

if settings.serve_uploads:
  Path(settings.uploads_dir).mkdir(parents=True, exist_ok=True)
  app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")

# register a GET route 
@app.get('/health')
def health_check(db: Session = Depends(get_db)):
  db.execute(text("Select 1"))
  return {"status": "ok", "database":"connected successfully"}