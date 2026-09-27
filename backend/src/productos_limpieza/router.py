import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database import get_db
from src.productos_limpieza import schemas, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/productos_limpieza", tags=["productos_limpieza"])


@router.post("/", response_model=schemas.ProductoLimpieza)
def create_producto(
    producto: schemas.ProductoLimpiezaCreate, db: Session = Depends(get_db)
):
    return services.crear_producto(db, producto)


@router.get("/", response_model=list[schemas.ProductoLimpieza])
def read_productos(con_stock: bool = False, db: Session = Depends(get_db)):
    logger.info("Consultando productos de limpieza desde endpoint...")
    if con_stock:
        return services.listar_productos_con_stock(db)
    return services.listar_productos(db)


@router.get("/{producto_id}", response_model=schemas.ProductoLimpieza)
def read_producto(producto_id: int, db: Session = Depends(get_db)):
    return services.leer_producto(db, producto_id)


@router.put("/{producto_id}", response_model=schemas.ProductoLimpieza)
def update_producto(
    producto_id: int,
    producto: schemas.ProductoLimpiezaUpdate,
    db: Session = Depends(get_db),
):
    return services.modificar_producto(db, producto_id, producto)


@router.delete("/{producto_id}", response_model=schemas.ProductoLimpiezaDelete)
def delete_producto(producto_id: int, db: Session = Depends(get_db)):
    return services.eliminar_producto(db, producto_id)
