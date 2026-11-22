from datetime import datetime
from typing import Annotated, List, Optional

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, computed_field

from src.datos_nutricionales.constants import (
    UNIDAD_NUTRIENTE,
    UNIDAD_POR_DEFECTO,
    FuenteDatoNutricional,
    Nutriente,
    EstadoTablaNutricional,
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


# backend/src/datos_nutricionales/schemas.py
class FaltanteNutricionalInsumo(BaseModel):
    insumo_id: int
    insumo_nombre: str
    tipo_uso: str = "ingrediente"
    datos_faltantes: List[str] = Field(default_factory=list)
    sin_fuente: List[str] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


class FilaNutricionalNormativa(BaseModel):
    nutriente: Nutriente
    nombre: str
    subnivel: bool = False
    obligatorio: bool = True
    valor_100g: Optional[float] = None
    valor_porcion: Optional[float] = None
    porcentaje_vd: Optional[int] = None
    completo: bool = True

    @computed_field
    @property
    def unidad(self) -> str:
        return UNIDAD_NUTRIENTE.get(self.nutriente, UNIDAD_POR_DEFECTO)


class InformacionNutricionalProducto(BaseModel):
    producto_id: int
    producto_nombre: str
    unidad_base: str
    porcion: Optional[float] = None
    medida_casera: Optional[str] = None
    estado: EstadoTablaNutricional
    leyenda: str
    nota_pie: str
    insumos_sin_datos: List[str] = Field(default_factory=list)
    filas: List[FilaNutricionalNormativa]
    faltantes: List[FaltanteNutricionalInsumo] = Field(default_factory=list)