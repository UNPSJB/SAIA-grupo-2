from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.alergenos import schemas, services
from src.database import get_db

router = APIRouter(prefix="/alergenos", tags=["alergenos"])


@router.get("/", response_model=List[schemas.ResumenProducto])
def read_resumen(db: Session = Depends(get_db)):
    return services.resumen(db)


@router.get("/insumos", response_model=List[schemas.MarcaInsumo])
def read_marcas(db: Session = Depends(get_db)):
    return services.listar_marcas(db)


@router.put("/insumos", response_model=List[schemas.MarcaInsumo])
def update_marcas(datos: schemas.ActualizacionMarcas, db: Session = Depends(get_db)):
    return services.actualizar_marcas(db, datos)


@router.get("/productos/{producto_id}", response_model=schemas.DetalleProducto)
def read_detalle(producto_id: int, db: Session = Depends(get_db)):
    return services.detalle_producto(db, producto_id)


@router.put("/productos/{producto_id}/declaracion", response_model=schemas.DetalleProducto)
def update_declaracion(producto_id: int, datos: schemas.DeclaracionUpdate, db: Session = Depends(get_db)):
    return services.guardar_declaracion(db, producto_id, datos)


@router.put("/productos/{producto_id}/conservacion", response_model=schemas.DetalleProducto)
def update_conservacion(producto_id: int, datos: schemas.ConservacionUpdate, db: Session = Depends(get_db)):
    return services.guardar_conservacion(db, producto_id, datos)
