"""Punto de entrada del servidor dev.

Uso:
    python run.py
"""

import uvicorn
from pathlib import Path

from app.core.config import get_settings


def main() -> None:
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        reload_dirs=[str(Path(__file__).resolve().parent / "app")],
    )


if __name__ == "__main__":
    main()