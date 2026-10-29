import argparse

from app.database import SessionLocal
from app.services import upload_service


def cleanup_uploads() -> None:
    with SessionLocal() as db:
        count = upload_service.cleanup_orphan_uploads(db)
    print(f"Deleted {count} orphan upload(s)")


COMMANDS = {"cleanup-uploads": cleanup_uploads}


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    parser.add_argument("command", choices=COMMANDS)
    args = parser.parse_args()
    COMMANDS[args.command]()


if __name__ == "__main__":
    main()
