"""Caso de uso Configuracion: persistencia de parametros tecnicos, pruebas
reales de conexion MySQL (pymysql) y validacion de token WhatsApp (Graph API)."""

import json
import time
import urllib.error
import urllib.request
from datetime import datetime

import pymysql

from app.application.schemas.configuracion import ConfiguracionUpdate
from app.domain.entities.configuracion import Configuracion
from app.infrastructure.security import decrypt_secret, encrypt_secret
from app.interfaces.repository import (
    AgenciaRepositoryContract,
    ConfiguracionRepositoryContract,
)
from app.interfaces.services import ConfiguracionService as ConfiguracionServiceContract


class ConfiguracionService(ConfiguracionServiceContract):
    def __init__(
        self,
        repo: ConfiguracionRepositoryContract,
        agencia_repo: AgenciaRepositoryContract,
    ) -> None:
        self._repo = repo
        self._agencias = agencia_repo

    def obtener(self) -> Configuracion:
        cfg = self._repo.get_singleton()
        if cfg is None:
            cfg = self._repo.add(Configuracion(id=1))
        return cfg

    def guardar(self, datos: ConfiguracionUpdate) -> Configuracion:
        cfg = self.obtener()
        cfg.db_host = datos.db_host.strip()
        cfg.db_port = datos.db_port
        cfg.db_user = datos.db_user.strip()
        if datos.db_password:
            cfg.db_password_enc = encrypt_secret(datos.db_password)
        if datos.wa_number is not None:
            cfg.wa_number = datos.wa_number.strip()
        if datos.wa_token:
            cfg.wa_token_enc = encrypt_secret(datos.wa_token.strip())
        cfg.actualizado_en = datetime.now()
        return self._repo.update(cfg)

    def probar_mysql(
        self,
        host: str,
        port: int,
        user: str,
        password: str | None,
    ) -> dict:
        cfg = self.obtener()
        if not user:
            user = cfg.db_user
        if password is None:
            password = decrypt_secret(cfg.db_password_enc)
        inicio = time.perf_counter()
        try:
            conn = pymysql.connect(
                host=host,
                port=port,
                user=user,
                password=password or "",
                connect_timeout=3,
                read_timeout=4,
            )
            conn.close()
            latencia = int((time.perf_counter() - inicio) * 1000)
            return {"ok": True, "latency_ms": latencia, "error": None}
        except pymysql.MySQLError as exc:
            detalle = str(getattr(exc, "args", exc))[:200]
            return {"ok": False, "latency_ms": None, "error": detalle}
        except OSError as exc:
            return {
                "ok": False,
                "latency_ms": None,
                "error": f"Sin respuesta de red ({exc.__class__.__name__})",
            }

    def probar_whatsapp(self, token: str | None) -> dict:
        if not token:
            token = decrypt_secret(self.obtener().wa_token_enc)
        if not token:
            return {"ok": False, "verified": False, "error": "No hay token configurado."}
        url = f"https://graph.facebook.com/v21.0/me?fields=id,name&access_token={token}"
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                datos = json.loads(resp.read().decode("utf-8"))
            ok = bool(datos.get("id"))
            return {
                "ok": ok,
                "verified": True,
                "error": None if ok else "Respuesta inesperada de Meta.",
            }
        except urllib.error.HTTPError as exc:
            return {
                "ok": False,
                "verified": True,
                "error": f"Meta rechazo el token (HTTP {exc.code}).",
            }
        except (OSError, ValueError):
            return {
                "ok": False,
                "verified": False,
                "error": "Sin salida a internet para verificar con Meta.",
            }

    def mapear_servidores(self, items: list[tuple[str, str, int]]) -> int:
        actualizados = 0
        for codigo, host, puerto in items:
            agencia = self._agencias.get_by_codigo(codigo)
            if agencia and (agencia.host != host or agencia.puerto != puerto):
                agencia.host = host
                agencia.puerto = puerto
                self._agencias.update(agencia)
                actualizados += 1
        return actualizados
