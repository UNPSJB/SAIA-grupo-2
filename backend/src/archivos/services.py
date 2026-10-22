from typing import Optional

from src.archivos import exceptions
from src.archivos.constants import CARACTERES_MAXIMOS, PREFIJOS_VALIDOS


def validar_archivo(archivo_url: str) -> None:
    """Valida que un archivo embebido como data URL sea imagen o PDF y no exceda el tamanio permitido."""
    if not archivo_url.startswith(PREFIJOS_VALIDOS):
        raise exceptions.ArchivoFormatoInvalido()

    if len(archivo_url) > CARACTERES_MAXIMOS:
        raise exceptions.ArchivoDemasiadoGrande()


def validar_archivo_opcional(archivo_url: Optional[str]) -> None:
    """Valida el archivo solo cuando viene informado."""
    if archivo_url:
        validar_archivo(archivo_url)
