from src.checklists.constants import ErrorCode
from src.exceptions import NotFound, BadRequest


class ChecklistNoEncontrado(NotFound):
    DETAIL = ErrorCode.CHECKLIST_NO_ENCONTRADO


class ProductoNoEncontrado(NotFound):
    DETAIL = ErrorCode.PRODUCTO_NO_ENCONTRADO


class StockInsuficiente(BadRequest):
    DETAIL = ErrorCode.STOCK_INSUFICIENTE