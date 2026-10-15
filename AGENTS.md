# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

A personal flashcard and quiz app for daily, solo use (no social features).
Cards are scheduled with the SM-2 spaced repetition algorithm.

Roadmap:

- **v1:** decks and cards, SM-2 review sessions, quiz mode (multiple choice built from other cards in the same deck), basic stats
- **v2:** AI card generation from notes and images, custom quiz questions
- **v3:** weekly/monthly dashboard, Pomodoro timer, garden gamification

## Stack

| Layer                  | Choice                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Backend                | FastAPI (REST), Python 3.13, sync SQLAlchemy 2.0                                                                                    |
| Database               | PostgreSQL 16 in Docker, migrations with Alembic                                                                                    |
| Auth                   | Argon2 password hashing, JWT access token (15 min), random refresh token in an httpOnly cookie (14 days), stored hashed and rotated |
| Frontend (not started) | Vite + React, CSS Modules, mobile-first PWA                                                                                         |

## Repository layout

```
study-app/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, includes routers
│   │   ├── config.py          # Settings from .env (pydantic-settings)
│   │   ├── database.py        # engine, SessionLocal, Base, get_db
│   │   ├── security.py        # password hashing, JWT, refresh token helpers
│   │   ├── dependencies.py    # get_current_user, CurrentUser
│   │   ├── models/            # SQLAlchemy models, one file per table
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── services/          # business logic, one module per feature
│   │   └── routers/           # HTTP routes, one module per feature
│   ├── alembic/               # migrations
│   ├── docker-compose.yml     # Postgres
│   ├── requirements.txt
│   ├── .env                   # secrets, never committed
│   └── .env.example
└── frontend/                  # empty for now
```

## Commands (run from `backend/` with the venv active)

```bash
source .venv/bin/activate
docker compose up -d
uvicorn app.main:app --reload
alembic revision --autogenerate -m "message"
alembic upgrade head
alembic check
pip freeze > requirements.txt
```

## Architecture rules

1. **Layers:** router → service → models. Routers handle HTTP only (parsing input, status codes, cookies). Services hold all business logic and database access. Services never import FastAPI or raise `HTTPException`.
2. **Naming:** each route function and the service function it calls have the **same name** (route `login` → `auth_service.login`). Helpers used only inside a module start with `_`.
3. **Services are modules of functions**, not classes. They take `db: Session` as the first argument.
4. **Errors:** services raise their own exception classes (e.g. `EmailAlreadyRegisteredError`). Routers catch them and map them to HTTP status codes.
5. **Schemas** live in `app/schemas/` and are separate from models. Responses always use a `response_model` so internal fields (like `password_hash`) are never returned. Output schemas use `ConfigDict(from_attributes=True)`.
6. **Auth:** protected routes take `current_user: CurrentUser` (from `app/dependencies.py`).
7. **Ownership:** a user can only access their own data. A resource that doesn't exist or belongs to another user returns **404**, never 403.
8. **Updates use `PATCH`** with all fields optional; only fields that were sent are changed.
9. **Cards are soft-deleted** by setting `deleted_at`. Queries for active cards filter `deleted_at IS NULL`. Reviews are never deleted, so stats stay accurate.
10. **Emails are lowercased** in the Pydantic schemas before they reach services.

## Code style

- 4-space indentation, type hints everywhere.
- SQLAlchemy 2.0 style: `Mapped[...]`, `mapped_column`, `select(...)`, `db.scalar(...)`, `db.get(...)`.
- In `ForeignKey("table.column")`, use the **table name** (plural, e.g. `users.id`), not the class name.
- Relationship pairs must use matching `back_populates` on both sides; use `TYPE_CHECKING` imports for type hints between models.
- All timestamps are timezone-aware UTC (`DateTime(timezone=True)`, `datetime.now(timezone.utc)`).
- Group long files into sections with banner comments in this style:

```python
##########################################################
#                       SECTION NAME
##########################################################
```

- Keep code free of long explanatory comments. Explain changes in your reply instead.

## Database and migrations

- Never change the database structure by hand (DBeaver, psql). All schema changes go through models + Alembic.
- Never edit a migration that has already been applied or pushed. Fix forward with a new migration.
- Autogenerate cannot detect renames: write renames by hand with `op.alter_column(..., new_column_name=...)`.
- Always read a generated migration before running `alembic upgrade head`, and run `alembic check` after.

## Secrets and git

- Never read, print, modify or commit `backend/.env`. New settings go into `config.py` and `.env.example` with placeholder values.
- Work on the `develop` branch. Do not commit or push unless asked.

## How to work with me

I'm learning FastAPI, SQLAlchemy and Postgres through this project (I come from Express and NestJS).

- Work on **one step at a time** and stop when it's done. Don't continue to the next step until I say so.
- Only touch files the step needs. Say which files you created or changed.
- After each step, explain what the new code does in plain language, with comparisons to Express/NestJS where helpful.
- After each step, give me the commands to test it (curl or `/docs`), with the expected status codes. Put explanations after each command block, not as comments inside the commands.
- Suggest a commit message in the conventional style (`feat:`, `fix:`, `refactor:`, `chore:`).
- If something in my request conflicts with these rules, point it out before changing anything.
