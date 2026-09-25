from enum import Enum


class ErrorCode:
    TAREA_NO_ENCONTRADA = "La tarea no fue encontrada."
    TITULO_DUPLICADO_EN_PLAN = "Ya existe una tarea con ese titulo en este plan."
    CANTIDAD_INVALIDA = "La cantidad estimada debe ser mayor a cero."
    PRODUCTO_REPETIDO = "No se puede cargar dos veces el mismo producto en una tarea."
    SIN_STOCK = "No se puede estimar consumo de un producto sin stock."


class FrecuenciaTarea(str, Enum):
    DIARIA = "diaria"
    SEMANAL = "semanal"
