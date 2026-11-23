from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.database import get_db
from src.rotulado_frontal import schemas, services

router = APIRouter(prefix="/rotulado-frontal", tags=["rotulado-frontal"])


@router.get("/", response_model=List[schemas.EstadoProducto])
def read_resumen(db: Session = Depends(get_db)):
    return services.resumen(db)


@router.get("/insumos", response_model=List[schemas.MarcaInsumo])
def read_marcas_insumos(db: Session = Depends(get_db)):
    return services.listar_marcas_insumos(db)


@router.put("/insumos", response_model=List[schemas.MarcaInsumo])
def update_marcas_insumos(datos: schemas.ActualizacionMarcasInsumos, db: Session = Depends(get_db)):
    return services.actualizar_marcas_insumos(db, datos)


@router.get("/productos/{producto_id}/propuesta", response_model=schemas.PropuestaMarcas)
def read_propuesta(producto_id: int, db: Session = Depends(get_db)):
    return services.proponer_marcas(db, producto_id)


@router.get("/productos/{producto_id}/calculo-sellos", response_model=schemas.ResultadoCalculoSellos)
def read_calculo_sellos(producto_id: int, db: Session = Depends(get_db)):
    calculo = services.obtener_calculo_sellos_vigente(db, producto_id)
    if calculo is None:
        raise HTTPException(status_code=404, detail="El producto aún no cuenta con un cálculo de sellos.")
    return calculo


@router.post("/productos/{producto_id}/calcular-sellos", response_model=schemas.ResultadoCalculoSellos)
def create_calculo_sellos(producto_id: int, datos: schemas.SolicitudCalculoSellos, db: Session = Depends(get_db)):
    return services.calcular_sellos_producto(db, producto_id, datos.empleado_id)


@router.get("/productos/{producto_id}", response_model=schemas.EstadoProducto)
def read_estado_producto(producto_id: int, db: Session = Depends(get_db)):
    return services.estado_producto(db, producto_id)


@router.get("/productos/{producto_id}/historial", response_model=List[schemas.Evaluacion])
def read_historial(producto_id: int, db: Session = Depends(get_db)):
    return services.historial(db, producto_id)


@router.post("/productos/{producto_id}", response_model=schemas.Evaluacion)
def create_evaluacion(producto_id: int, datos: schemas.NuevaEvaluacion, db: Session = Depends(get_db)):
    return services.evaluar(db, producto_id, datos)
