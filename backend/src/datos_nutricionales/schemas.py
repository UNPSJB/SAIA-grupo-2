from datetime import datetime
from typing import Annotated, List, Optional

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, computed_field

from src.datos_nutricionales.constants import (
    UNIDAD_NUTRIENTE,
    UNIDAD_POR_DEFECTO,
    FuenteDatoNutricional,
    Nutriente,
)
from src.documentacion.schemas import EmpleadoResumen
from src.unidades_medida.constants import MagnitudUnidad

TextoReferencia = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]


class DatoNutricionalEntrada(BaseModel):
    nutriente: Nutriente
    valor: Optional[float] = None
    fuente: FuenteDatoNutricional
    alimento_codigo: Optional[str] = None
    referencia: Optional[TextoReferencia] = None


class CargaDatosNutricionales(BaseModel):
    empleado_id: int
    datos: List[DatoNutricionalEntrada] = Field(min_length=1)


class AlimentoResumen(BaseModel):
    codigo: str
    nombre: str
    magnitud: MagnitudUnidad
    nombre_en_pdf: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DatoNutricional(BaseModel):
    nutriente: Nutriente
    valor: float
    fuente: FuenteDatoNutricional
    alimento: Optional[AlimentoResumen] = None
    referencia: Optional[str] = None
    valor_fuente: float
    fecha_carga: datetime
    cargado_por: EmpleadoResumen
    modificado: bool
    modificado_por: Optional[EmpleadoResumen] = None
    fecha_modificacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def unidad(self) -> str:
        return UNIDAD_NUTRIENTE.get(self.nutriente, UNIDAD_POR_DEFECTO)


class InsumoResumen(BaseModel):
    id: int
    nombre: str
    activo: bool
    magnitud: MagnitudUnidad


class DatosNutricionalesInsumo(BaseModel):
    insumo: InsumoResumen
    datos: List[DatoNutricional]


class ResumenNutricionalInsumo(BaseModel):
    insumo: InsumoResumen
    cargados: int
    total: int
    modificados: int
    fuentes: List[FuenteDatoNutricional]
    ultima_actualizacion: Optional[datetime] = None


class ValorDiarioReferenciaBase(BaseModel):
    valor_diario: Optional[float] = None
    unidad: str = "g"
    umbral_no_significativo: float = 0.0
    decimales: int = 1


class ValorDiarioReferenciaUpdate(BaseModel):
    valor_diario: Optional[float] = None
    unidad: Optional[str] = None
    umbral_no_significativo: Optional[float] = None
    decimales: Optional[int] = None


class ValorDiarioReferencia(ValorDiarioReferenciaBase):
    nutriente: Nutriente
    model_config = ConfigDict(from_attributes=True)
