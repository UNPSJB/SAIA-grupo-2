
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from src.database import get_db
from src.rotulados import services, schemas


router = APIRouter(prefix="/rotulos", tags=["Rótulos"])


def obtener_empleado_id(
    x_user_id: Optional[int] = Header(default=None, alias="X-User-Id"),
) -> int:
    if x_user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Se requiere identificar al empleado."
        )
    return x_user_id


@router.post("/", response_model=schemas.RotuloRespuesta, status_code=201)
def crear_rotulo(
    datos: schemas.RotuloCrear,
    db: Session = Depends(get_db),
    empleado_id: int = Depends(obtener_empleado_id),
):
    return services.crear_rotulo(db, datos, empleado_id)


@router.get("/", response_model=list[schemas.RotuloRespuesta])
def listar_rotulos(db: Session = Depends(get_db)):
    return services.listar_rotulos(db)


@router.get("/producto/{producto_id}", response_model=Optional[schemas.RotuloRespuesta])
def obtener_rotulo_producto(
    producto_id: int,
    db: Session = Depends(get_db),
):
    return services.obtener_rotulo_producto(db, producto_id)


@router.get("/{rotulo_id}", response_model=schemas.RotuloRespuesta)
def obtener_rotulo(
    rotulo_id: int,
    db: Session = Depends(get_db),
):
    return services.obtener_rotulo(db, rotulo_id)


@router.patch("/{rotulo_id}", response_model=schemas.RotuloRespuesta)
def actualizar_rotulo(
    rotulo_id: int,
    datos: schemas.RotuloActualizar,
    db: Session = Depends(get_db),
    empleado_id: int = Depends(obtener_empleado_id),
):
    return services.actualizar_rotulo(db, rotulo_id, datos, empleado_id)


@router.post("/{rotulo_id}/actualizar-snapshots", response_model=schemas.RotuloRespuesta)
def actualizar_snapshots(
    rotulo_id: int,
    db: Session = Depends(get_db),
    empleado_id: int = Depends(obtener_empleado_id),
):
    return services.actualizar_snapshots(db, rotulo_id, empleado_id)


@router.get("/{rotulo_id}/completitud")
def calcular_completitud(
    rotulo_id: int,
    rotulo_lote_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    return services.calcular_completitud(db, rotulo_id, rotulo_lote_id)


@router.post(
    "/{rotulo_id}/lotes",
    response_model=schemas.RotuloLoteRespuesta,
    status_code=201,
)
def asociar_lote(
    rotulo_id: int,
    datos: schemas.RotuloLoteCrear,
    db: Session = Depends(get_db),
    empleado_id: int = Depends(obtener_empleado_id),
):
    return services.asociar_lote(db, rotulo_id, datos, empleado_id)


@router.get(
    "/{rotulo_id}/lotes",
    response_model=list[schemas.RotuloLoteRespuesta],
)
def listar_lotes_rotulo(
    rotulo_id: int,
    db: Session = Depends(get_db),
):
    return services.listar_lotes_rotulo(db, rotulo_id)


@router.patch(
    "/lotes/{rotulo_lote_id}",
    response_model=schemas.RotuloLoteRespuesta,
)
def actualizar_rotulo_lote(
    rotulo_lote_id: int,
    datos: schemas.RotuloLoteActualizar,
    db: Session = Depends(get_db),
    empleado_id: int = Depends(obtener_empleado_id),
):
    return services.actualizar_rotulo_lote(
        db, rotulo_lote_id, datos, empleado_id
    )


@router.get(
    "/{rotulo_id}/historial",
    response_model=list[schemas.HistorialCambioRotuloRespuesta],
)
def listar_historial(
    rotulo_id: int,
    db: Session = Depends(get_db),
):
    return services.listar_historial(db, rotulo_id)
