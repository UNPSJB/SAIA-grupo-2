from src.models import ModeloBase
from sqlalchemy.orm import Mapped,mapped_column 

class Equipo(ModeloBase):
    __tablename__ = "equipos"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column()
    activo: Mapped[bool] = mapped_column()
    ubicacion: Mapped[str] = mapped_column()
    tipo: Mapped[str] = mapped_column()