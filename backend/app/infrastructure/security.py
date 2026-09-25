"""Cifrado de secretos en reposo (Fernet).

Prioridad de la clave:
  1. SECRET_KEY definida en el entorno / .env
  2. Archivo auto-generado backend/.hana_secret.key (excluido del git)
"""

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import PROJECT_ROOT, get_settings

_KEY_FILE = PROJECT_ROOT / "backend" / ".hana_secret.key"


def _load_key() -> bytes:
    configured = get_settings().SECRET_KEY
    if configured:
        return configured.encode()
    if _KEY_FILE.exists():
        return _KEY_FILE.read_bytes().strip()
    key = Fernet.generate_key()
    _KEY_FILE.write_bytes(key)
    return key


@lru_cache
def _fernet() -> Fernet:
    return Fernet(_load_key())


def encrypt_secret(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_secret(token: str | None) -> str:
    if not token:
        return ""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return ""
