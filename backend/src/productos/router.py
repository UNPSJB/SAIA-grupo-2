from typing import List
from datetime import date
from typing import Optional


from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.documentos_versionados.router import verificar_rol_admin
from src.lotes_produccion.schemas import LoteProduccion
from src.productos import schemas, services

router = APIRouter(prefix="/productos", tags=["productos"])


@router.get("/", response_model=List[schemas.Producto])
def read_productos(db: Session = Depends(get_db)):
    return services.listar_productos(db)


@router.post("/", response_model=schemas.Producto)
def create_producto(producto: schemas.ProductoCreate, db: Session = Depends(get_db)):
    return services.crear_producto(db, producto)


@router.get("/estadisticas", response_model=schemas.EstadisticasProduccion, dependencies=[Depends(verificar_rol_admin)],)
def read_estadisticas_produccion(fecha_desde: Optional[date] = None, fecha_hasta: Optional[date] = None, db: Session = Depends(get_db),):
    return services.obtener_estadisticas_produccion(db, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta,)


@router.get("/{producto_id}", response_model=schemas.Producto)
def read_producto(producto_id: int, db: Session = Depends(get_db)):
    return services.leer_producto(db, producto_id)


@router.put("/{producto_id}", response_model=schemas.Producto)
def update_producto(producto_id: int, producto: schemas.ProductoUpdate, db: Session = Depends(get_db)):
    return services.modificar_producto(db, producto_id, producto)


@router.get("/{producto_id}/lotes", response_model=List[LoteProduccion])
def read_lotes_de_producto(producto_id: int, db: Session = Depends(get_db)):
    return services.listar_lotes_de_producto(db, producto_id)
