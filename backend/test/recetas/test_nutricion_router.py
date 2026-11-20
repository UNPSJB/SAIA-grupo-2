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

def test_router_obtener_nutricion_version_vigente(client: TestClient, db_session: Session):
    um = db_session.query(UnidadMedida).first()
    if not um:
        um = UnidadMedida(nombre="Gramos", magnitud=MagnitudUnidad.MASA, factor_base=1.0)
        db_session.add(um)
        db_session.commit()
        db_session.refresh(um)

    prod = Producto(nombre="Galletas de Vainilla", tipo=TipoProducto.ALIMENTO, unidad_medida_id=um.id)
    ins = Insumo(nombre="Harina Leudante", activo=True, unidad_medida_id=um.id, cantidad=3000.0)
    db_session.add_all([prod, ins])
    db_session.commit()
    db_session.refresh(prod)
    db_session.refresh(ins)

    receta = services.crear_receta(
        db_session,
        schemas.RecetaCreate(
            producto_id=prod.id,
            version_inicial=schemas.VersionRecetaInicialCreate(
                rendimiento_final_gramos=1000.0,
                unidad_venta_gramos=100.0,
                detalles=[
                    schemas.DetalleRecetaCreate(
                        insumo_id=ins.id,
                        cantidad_gramos=800.0,
                        tipo_uso=TipoUsoInsumo.INGREDIENTE
                    )
                ]
            )
        )
    )

    respuesta = client.get(f"/recetas/{receta.id}/versiones/vigente/nutricion")
    assert respuesta.status_code == status.HTTP_200_OK
    cuerpo = respuesta.json()
    assert cuerpo["receta_id"] == receta.id
    assert cuerpo["version"] == 1
    assert "items" in cuerpo
    assert len(cuerpo["items"]) == 10
