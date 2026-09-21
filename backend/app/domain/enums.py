"""Contratos de la capa de dominio (SRP: cada entidad con una sola razón de cambio)."""

from enum import Enum


class Moneda(str, Enum):
    BS = "Bs"
    USD = "USD"


class EstadoDespacho(str, Enum):
    COMPLETADA = "Completada"
    EN_TRANSITO = "En tránsito"
    ANULADA = "Anulada"