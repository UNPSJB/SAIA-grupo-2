from pydantic import BaseModel, ConfigDict, model_validator
from datetime import date, datetime
from typing import Optional

# --- Clase funcional para aditivos ---
class ClaseFuncionalAditivoBase(BaseModel):
    nombre: str
    necesita_ins: bool = True

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
    clase_funcional: int
    numero_ins: Optional[int] = None
    

class AditivoCreate(AditivoBase):
    pass


class Aditivo(AditivoBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
