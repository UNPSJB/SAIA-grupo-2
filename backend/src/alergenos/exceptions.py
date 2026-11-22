from src.alergenos.constants import ErrorCode
from src.exceptions import BadRequest, PermissionDenied


class SinDatosConservacion(BadRequest):
    DETAIL = ErrorCode.SIN_DATOS_CONSERVACION


class TemperaturasInvertidas(BadRequest):
    DETAIL = ErrorCode.TEMPERATURAS_INVERTIDAS


class PermisoConfirmacion(PermissionDenied):
    DETAIL = ErrorCode.PERMISO_CONFIRMAR
