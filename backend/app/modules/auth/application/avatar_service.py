from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings
from app.modules.auth.domain.models import User
from app.shared.exceptions import AppException

ALLOWED_AVATAR_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def avatar_storage_dir() -> Path:
    path = Path(settings.upload_dir) / "avatars"
    path.mkdir(parents=True, exist_ok=True)
    return path


def avatar_public_path(user_id: int, extension: str) -> str:
    return f"/uploads/avatars/user_{user_id}{extension}"


def resolve_avatar_file(avatar_url: str | None) -> Path | None:
    if not avatar_url or not avatar_url.startswith("/uploads/avatars/"):
        return None
    filename = Path(avatar_url).name
    candidate = avatar_storage_dir() / filename
    if candidate.is_file():
        return candidate
    return None


def delete_avatar_file(avatar_url: str | None) -> None:
    file_path = resolve_avatar_file(avatar_url)
    if file_path is not None:
        file_path.unlink(missing_ok=True)


class AvatarService:
    @staticmethod
    async def save_user_avatar(*, user: User, file: UploadFile) -> str:
        content_type = (file.content_type or "").split(";", 1)[0].strip().lower()
        extension = ALLOWED_AVATAR_MIME.get(content_type)
        if extension is None:
            raise AppException(
                "Formato no soportado. Usa JPG, PNG, WebP o GIF.",
                status_code=400,
            )

        content = await file.read()
        if not content:
            raise AppException("No se envió ninguna imagen", status_code=400)
        if len(content) > settings.avatar_max_bytes:
            max_mb = settings.avatar_max_bytes / (1024 * 1024)
            raise AppException(f"La imagen supera el límite de {max_mb:.0f} MB", status_code=400)

        delete_avatar_file(user.avatar_url)

        destination = avatar_storage_dir() / f"user_{user.id}{extension}"
        destination.write_bytes(content)

        return avatar_public_path(user.id, extension)
