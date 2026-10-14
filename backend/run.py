"""Punto de entrada del servidor dev.

Uso:
    python run.py
"""

import uvicorn
from pathlib import Path

from app.core.config import get_settings


def main() -> None:
    settings = get_settings()
    kwargs = {}
    if settings.DEBUG:
        kwargs["reload_dirs"] = [str(Path(__file__).resolve().parent / "app")]
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        **kwargs,
    )


if __name__ == "__main__":
    main()