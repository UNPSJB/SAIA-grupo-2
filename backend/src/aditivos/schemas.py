from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional

# --- Clase funcional para aditivos ---
class ClaseFuncionalAditivoBase(BaseModel):
    nombre: str
    necesita_ins: bool = True

    @field_validator("nombre")
    @classmethod
    def convertirAMinusculas(cls, valor:str) -> str:
        return valor.strip().lower()

class ClaseFuncionalAditivoCreate(ClaseFuncionalAditivoBase):
    pass

class ClaseFuncionalAditivoUpdate(ClaseFuncionalAditivoBase):
    pass

class ClaseFuncionalAditivo(ClaseFuncionalAditivoBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Aditivo ---
class AditivoBase(BaseModel):
    nombre_completo: str
    clase_funcional_id: int
    numero_ins: Optional[str] = None
    

class AditivoCreate(AditivoBase):
    pass


class Aditivo(AditivoBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
