class ErrorCode:
    ARCHIVO_FORMATO_INVALIDO = "El archivo debe ser una imagen o un archivo PDF"
    ARCHIVO_DEMASIADO_GRANDE = "El archivo no puede superar los 25 MB"


TAMANIO_MAXIMO_MB = 25

PREFIJOS_VALIDOS = ("data:image/", "data:application/pdf")

BYTES_POR_MB = 1024 * 1024

CARACTERES_MAXIMOS = int(TAMANIO_MAXIMO_MB * BYTES_POR_MB * 4 / 3) + 1024
