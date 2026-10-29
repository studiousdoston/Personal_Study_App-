from fastapi import HTTPException, status
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.config import settings

MULTIPART_OVERHEAD_BYTES = 64 * 1024
TOO_LARGE_DETAIL = "File is too large"


class UploadSizeLimit:
    def __init__(self, app: ASGIApp, path: str) -> None:
        self.app = app
        self.path = path

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if not self._applies(scope):
            await self.app(scope, receive, send)
            return
        limit = settings.upload_max_bytes + MULTIPART_OVERHEAD_BYTES
        content_length = dict(scope["headers"]).get(b"content-length")
        if content_length and content_length.isdigit() and int(content_length) > limit:
            response = JSONResponse(
                {"detail": TOO_LARGE_DETAIL}, status_code=status.HTTP_413_CONTENT_TOO_LARGE
            )
            await response(scope, receive, send)
            return
        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail=TOO_LARGE_DETAIL
                    )
            return message

        await self.app(scope, limited_receive, send)

    def _applies(self, scope: Scope) -> bool:
        return (
            scope["type"] == "http"
            and scope["method"] == "POST"
            and scope["path"].rstrip("/").endswith(self.path)
        )
