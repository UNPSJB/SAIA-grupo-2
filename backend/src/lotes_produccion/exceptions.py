from src.exceptions import BadRequest, NotFound
from src.lotes_produccion.constants import ErrorCode


class LoteNoEncontrado(NotFound):
    DETAIL = ErrorCode.LOTE_NO_ENCONTRADO


class FechaFutura(BadRequest):
    DETAIL = ErrorCode.FECHA_FUTURA


class CantidadInvalida(BadRequest):
    DETAIL = ErrorCode.CANTIDAD_INVALIDA


class RangoFechasInvalido(BadRequest):
    DETAIL = ErrorCode.RANGO_FECHAS_INVALIDO


class InsumoNoEncontrado(NotFound):
    DETAIL = ErrorCode.INSUMO_NO_ENCONTRADO


class InsumoInactivo(BadRequest):
    DETAIL = ErrorCode.INSUMO_INACTIVO


class InsumoRepetido(BadRequest):
    DETAIL = ErrorCode.INSUMO_REPETIDO


class StockInsuficiente(BadRequest):
    DETAIL = ErrorCode.STOCK_INSUFICIENTE


class LoteCerrado(BadRequest):
    DETAIL = ErrorCode.LOTE_CERRADO
