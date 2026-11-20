from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.recetas import services, schemas
from src.recetas.constants import TipoUsoInsumo
from src.productos.models import Producto
from src.productos.constants import TipoProducto
from src.insumos.models import Insumo
from src.unidades_medida.models import UnidadMedida
from src.unidades_medida.constants import MagnitudUnidad

HEADERS_ADMIN = {"X-User-Role": "admin"}

def _crear_datos_base(db: Session):
    um = db.query(UnidadMedida).first()
    if not um:
        um = UnidadMedida(nombre="Gramos", magnitud=MagnitudUnidad.MASA, factor_base=1.0)
        db.add(um)
        db.commit()
        db.refresh(um)

    prod = Producto(nombre="Pan de Molde", tipo=TipoProducto.ALIMENTO, unidad_medida_id=um.id)
    ins = Insumo(nombre="Harina 000", activo=True, unidad_medida_id=um.id, cantidad=5000.0)
    db.add_all([prod, ins])
    db.commit()
    db.refresh(prod)
    db.refresh(ins)
    return prod, ins

def test_router_crear_y_leer_receta(client: TestClient, db_session: Session):
    prod, ins = _crear_datos_base(db_session)

    payload = {
        "producto_id": prod.id,
        "version_inicial": {
            "rendimiento_final_gramos": 1000.0,
            "unidad_venta_gramos": 500.0,
            "medida_casera": "1 molde (500g)",
            "motivo_cambio": "Fórmula base de panadería",
            "detalles": [
                {
                    "insumo_id": ins.id,
                    "cantidad_gramos": 1000.0,
                    "tipo_uso": "ingrediente"
                }
            ],
            "pasos": [
                {
                    "orden": 1,
                    "nombre_paso": "Amasado",
                    "procedimiento": "Amasar 15 min",
                    "es_punto_control": False
                }
            ]
        }
    }

    res_post = client.post("/recetas/", json=payload, headers=HEADERS_ADMIN)
    assert res_post.status_code == status.HTTP_200_OK
    receta_id = res_post.json()["id"]

    res_get = client.get(f"/recetas/{receta_id}")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.json()["producto"]["nombre"] == "Pan de Molde"

    res_vigente = client.get(f"/recetas/{receta_id}/versiones/vigente")
    assert res_vigente.status_code == status.HTTP_200_OK
    assert res_vigente.json()["version"] == 1
    assert res_vigente.json()["rendimiento_final_gramos"] == 1000.0

def test_router_crear_version_nueva(client: TestClient, db_session: Session):
    prod, ins = _crear_datos_base(db_session)
    receta = services.crear_receta(
        db_session,
        schemas.RecetaCreate(
            producto_id=prod.id,
            version_inicial=schemas.VersionRecetaInicialCreate(
                rendimiento_final_gramos=1000.0,
                unidad_venta_gramos=500.0,
                detalles=[
                    schemas.DetalleRecetaCreate(
                        insumo_id=ins.id,
                        cantidad_gramos=1000.0,
                        tipo_uso=TipoUsoInsumo.INGREDIENTE
                    )
                ]
            )
        )
    )

    payload_v2 = {
        "rendimiento_final_gramos": 1100.0,
        "unidad_venta_gramos": 550.0,
        "motivo_cambio": "Incremento de humedad",
        "detalles": [
            {
                "insumo_id": ins.id,
                "cantidad_gramos": 1100.0,
                "tipo_uso": "ingrediente"
            }
        ]
    }

    res_v2 = client.post(f"/recetas/{receta.id}/versiones", json=payload_v2, headers=HEADERS_ADMIN)
    assert res_v2.status_code == status.HTTP_200_OK
    assert res_v2.json()["version"] == 2
    assert res_v2.json()["estado"] == "activo"

    res_lista = client.get(f"/recetas/{receta.id}/versiones")
    assert res_lista.status_code == status.HTTP_200_OK
    versiones = res_lista.json()
    assert len(versiones) == 2
