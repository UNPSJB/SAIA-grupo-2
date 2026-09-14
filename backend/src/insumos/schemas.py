from pydantic import BaseModel, ConfigDict
# Importamos el schema desde el otro módulo
from src.unidades_medida.schemas import UnidadMedida 

class InsumoBase(BaseModel):
    nombre: str
    unidad_medida_id: int

class InsumoCreate(InsumoBase):
    pass

class InsumoUpdate(InsumoBase):
    pass

class Insumo(InsumoBase):
    id: int
    unidad_medida: UnidadMedida  # Cuando pidamos un insumo, traerá los datos de su unidad
    
    model_config = ConfigDict(from_attributes=True)

class InsumoDelete(BaseModel):
    id: int
    msg: str
    model_config = ConfigDict(from_attributes=True)
