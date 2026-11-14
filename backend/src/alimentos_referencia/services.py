import csv
import unicodedata
from pathlib import Path
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.alimentos_referencia import exceptions
from src.alimentos_referencia.constants import (
    COLUMNAS_COMPLEMENTO_SARA2,
    COLUMNAS_CSV_SARA,
    DECIMALES,
    GRUPOS_EXCLUIDOS,
    LIMITE_BUSQUEDA,
    UNIDAD_CSV_MILILITROS,
)
from src.alimentos_referencia.models import AlimentoReferencia
from src.datos_nutricionales.constants import Nutriente
from src.unidades_medida.constants import MagnitudUnidad


def normalizar(texto: str) -> str:
    """Pasa el texto a minusculas y sin tildes, para buscar sin importar como se escriba."""
    descompuesto = unicodedata.normalize("NFD", texto.lower())
    return "".join(letra for letra in descompuesto if unicodedata.category(letra) != "Mn").strip()


def importar_desde_csv(db: Session, ruta: Path) -> int:
    """Carga o actualiza la base de referencia a partir del CSV que devuelve el servicio de SARA.

    Los suplementos (grupo S) quedan afuera. Los nutrientes que el CSV no informa
    (azucares y grasas trans) quedan nulos hasta importar el complemento de SARA 2.
    """
    cantidad = 0
    with open(ruta, encoding="utf-8", newline="") as archivo:
        for fila in csv.DictReader(archivo):
            codigo = fila["Codigo"].strip()
            if codigo.startswith(GRUPOS_EXCLUIDOS):
                continue

            alimento = db.get(AlimentoReferencia, codigo) or AlimentoReferencia(codigo=codigo)
            alimento.nombre = " ".join(fila["Alimento"].split())
            alimento.nombre_busqueda = normalizar(alimento.nombre)
            alimento.magnitud = (
                MagnitudUnidad.VOLUMEN
                if fila["UnidadMedida"].strip() == UNIDAD_CSV_MILILITROS
                else MagnitudUnidad.MASA
            )
            for columna, nutriente in COLUMNAS_CSV_SARA.items():
                setattr(alimento, nutriente.value, round(float(fila[columna]), DECIMALES))

            db.add(alimento)
            cantidad += 1

    db.commit()
    return cantidad


def _valor_opcional(texto: str) -> Optional[float]:
    texto = texto.strip()
    return round(float(texto), DECIMALES) if texto else None


def importar_complemento_sara2(db: Session, ruta: Path) -> int:
    """Completa azucares totales, azucares anadidos y grasas trans con la tabla SARA 2 (PDF).

    El archivo relaciona cada codigo del CSV con la fila equivalente del PDF. Solo se toman esos
    tres nutrientes; el resto sigue saliendo del CSV. Devuelve cuantos alimentos se completaron.
    """
    cantidad = 0
    with open(ruta, encoding="utf-8", newline="") as archivo:
        for fila in csv.DictReader(archivo):
            alimento = db.get(AlimentoReferencia, fila["Codigo"].strip())
            if alimento is None:
                continue
            alimento.nombre_en_pdf = " ".join(fila["AlimentoSara2"].split())
            for columna, nutriente in COLUMNAS_COMPLEMENTO_SARA2.items():
                setattr(alimento, nutriente.value, _valor_opcional(fila[columna]))
            cantidad += 1

    db.commit()
    return cantidad


def buscar_alimentos(db: Session, busqueda: str = "", limite: int = LIMITE_BUSQUEDA) -> List[AlimentoReferencia]:
    consulta = select(AlimentoReferencia)
    for palabra in normalizar(busqueda).split():
        consulta = consulta.where(AlimentoReferencia.nombre_busqueda.contains(palabra))
    return list(db.scalars(consulta.order_by(AlimentoReferencia.nombre).limit(limite)).all())


def leer_alimento(db: Session, codigo: str) -> AlimentoReferencia:
    alimento = db.get(AlimentoReferencia, codigo)
    if alimento is None:
        raise exceptions.AlimentoNoEncontrado()
    return alimento


def valor_de(alimento: AlimentoReferencia, nutriente: Nutriente) -> Optional[float]:
    return getattr(alimento, nutriente.value)
