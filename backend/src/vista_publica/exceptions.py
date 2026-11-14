from fastapi import HTTPException, status
from src.vista_publica.constants import CONFIGURACION_NO_ENCONTRADA, VISTA_PUBLICA_DESACTIVADA

class ConfiguracionNoEncontradaException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=CONFIGURACION_NO_ENCONTRADA
        )

class VistaPublicaDesactivadaException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=VISTA_PUBLICA_DESACTIVADA
        )
