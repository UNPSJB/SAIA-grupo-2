from datetime import date, datetime

from fastapi.testclient import TestClient
from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from src.asociaciones.lote_insumos import lote_insumo
from src.datos_nutricionales import schemas, services
from src.datos_nutricionales.constants import EstadoTablaNutricional, FuenteDatoNutricional, Nutriente
from src.datos_nutricionales.models import DatoNutricionalInsumo
from src.insumos.models import Insumo
from src.lotes_produccion.models import LoteProduccion
from src.productos.constants import TipoProducto
from src.productos.models import Producto
from src.unidades_medida.constants import MagnitudUnidad
from src.unidades_medida.models import UnidadMedida
from test.datos_nutricionales.test_tabla_normativa import COMPOSICION, _cargar_datos, _fila, gramos, receta

N = Nutriente


def _unidad(db: Session, nombre: str, magnitud: MagnitudUnidad, factor: float) -> UnidadMedida:
    unidad = db.scalar(select(UnidadMedida).where(UnidadMedida.nombre == nombre))
    if unidad is None:
        unidad = UnidadMedida(nombre=nombre, magnitud=magnitud, factor_base=factor)
        db.add(unidad)
        db.commit()
    return unidad


def _producto_con_lote(db: Session, admin, consumos: list) -> Producto:
    producto = Producto(nombre="Bizcochuelo sin receta", tipo=TipoProducto.ALIMENTO, unidad_medida=consumos[0][1])
    db.add(producto)
    db.commit()
    lote = LoteProduccion(producto_id=producto.id, fecha=date(2026, 11, 20), cantidad=1)
    db.add(lote)
    db.commit()
    for insumo, unidad, cantidad in consumos:
        db.execute(
            insert(lote_insumo).values(
                lote_id=lote.nro_lote, insumo_id=insumo.id, cantidad_utilizada=cantidad, unidad_medida_id=unidad.id
            )
        )
    db.commit()
    return producto


def test_actualizar_un_valor_diario_cambia_el_porcentaje(db_session: Session, receta):
    producto_id = receta["producto"].id
    assert _fila(services.obtener_informacion_nutricional_producto(db_session, producto_id), N.PROTEINAS).porcentaje_vd == 4

    actualizado = services.actualizar_valor_diario_referencia(
        db_session, N.PROTEINAS, schemas.ValorDiarioReferenciaUpdate(valor_diario=50, decimales=0, umbral_no_significativo=1)
    )

    assert (actualizado.valor_diario, actualizado.decimales) == (50, 0)
    proteinas = _fila(services.obtener_informacion_nutricional_producto(db_session, producto_id), N.PROTEINAS)
    assert (proteinas.valor_100g, proteinas.valor_porcion, proteinas.porcentaje_vd) == (6, 3, 6)


def test_el_umbral_configurado_lleva_a_cero_los_valores_no_significativos(db_session: Session, receta):
    services.actualizar_valor_diario_referencia(
        db_session, N.GRASAS_TRANS, schemas.ValorDiarioReferenciaUpdate(umbral_no_significativo=0.5)
    )

    trans = _fila(services.obtener_informacion_nutricional_producto(db_session, receta["producto"].id), N.GRASAS_TRANS)

    assert (trans.valor_100g, trans.valor_porcion) == (0, 0)


def test_la_porcion_y_la_medida_casera_se_pueden_indicar_al_consultar(db_session: Session, receta):
    tabla = services.obtener_informacion_nutricional_producto(
        db_session, receta["producto"].id, porcion=100, medida_casera="2 rebanadas"
    )

    assert (tabla.porcion, tabla.medida_casera) == (100, "2 rebanadas")
    assert _fila(tabla, N.ENERGIA).valor_porcion == 411


def test_sin_receta_ni_lotes_la_tabla_queda_incompleta(db_session: Session, gramos):
    producto = Producto(nombre="Producto nuevo", tipo=TipoProducto.BEBIDA, unidad_medida=gramos)
    db_session.add(producto)
    db_session.commit()

    tabla = services.obtener_informacion_nutricional_producto(db_session, producto.id)

    assert tabla.estado == EstadoTablaNutricional.INCOMPLETA
    assert tabla.unidad_base == "ml"
    assert all(fila.completo is False and fila.valor_100g is None for fila in tabla.filas)


def test_sin_receta_usa_los_insumos_de_los_lotes_convertidos_a_gramos(db_session: Session, admin, gramos):
    kilos = _unidad(db_session, "Kilogramos", MagnitudUnidad.MASA, 1000)
    harina = Insumo(nombre="Harina lote", unidad_medida=kilos, cantidad=10)
    azucar = Insumo(nombre="Azúcar lote", unidad_medida=gramos, cantidad=10000)
    db_session.add_all([harina, azucar])
    db_session.commit()
    _cargar_datos(db_session, harina, COMPOSICION["Harina"], admin)
    _cargar_datos(db_session, azucar, COMPOSICION["Azúcar"], admin)
    producto = _producto_con_lote(db_session, admin, [(harina, kilos, 0.6), (azucar, gramos, 400)])

    tabla = services.obtener_informacion_nutricional_producto(db_session, producto.id, porcion=50, medida_casera="1 porción")

    assert _fila(tabla, N.ENERGIA).valor_100g == 370
    assert _fila(tabla, N.AZUCARES_ANADIDOS).valor_100g == 40
    assert tabla.estado == EstadoTablaNutricional.COMPLETA


def test_sin_receta_un_insumo_de_lote_sin_datos_queda_como_faltante(db_session: Session, admin, gramos):
    litros = _unidad(db_session, "Litros", MagnitudUnidad.VOLUMEN, 1000)
    harina = Insumo(nombre="Harina lote", unidad_medida=gramos, cantidad=1000)
    leche = Insumo(nombre="Leche sin densidad", unidad_medida=litros, cantidad=10)
    huevo = Insumo(nombre="Huevo sin datos", unidad_medida=gramos, cantidad=1000)
    db_session.add_all([harina, leche, huevo])
    db_session.commit()
    _cargar_datos(db_session, harina, COMPOSICION["Harina"], admin)
    producto = _producto_con_lote(db_session, admin, [(harina, gramos, 500), (leche, litros, 0.2), (huevo, gramos, 100)])

    tabla = services.obtener_informacion_nutricional_producto(db_session, producto.id, porcion=50, medida_casera="1 porción")

    assert tabla.estado == EstadoTablaNutricional.INCOMPLETA
    assert set(tabla.insumos_sin_datos) == {"Leche sin densidad", "Huevo sin datos"}


def test_router_de_valores_diarios_y_tabla(client: TestClient, db_session: Session, receta):
    valores = client.get("/datos-nutricionales/valores-diarios")
    assert valores.status_code == 200
    assert {v["nutriente"]: v["valor_diario"] for v in valores.json()}["sodio"] == 2400

    actualizado = client.put("/datos-nutricionales/valores-diarios/sodio", json={"valor_diario": 2000})
    assert actualizado.status_code == 200
    assert actualizado.json()["valor_diario"] == 2000

    tabla = client.get(f"/productos/{receta['producto'].id}/informacion-nutricional", params={"porcion": 25})
    assert tabla.status_code == 200
    assert tabla.json()["porcion"] == 25
    assert client.get("/productos/999/informacion-nutricional").status_code == 404


def test_router_carga_y_consulta_datos_de_un_insumo(client: TestClient, db_session: Session, receta, admin):
    insumo = receta["insumos"]["Leudante"]
    datos = {"empleado_id": admin.id, "datos": [{"nutriente": "sodio", "valor": 27000, "fuente": "bibliografia", "referencia": "Tabla de prueba"}]}

    respuesta = client.put(f"/insumos/{insumo.id}/datos-nutricionales", json=datos)

    assert respuesta.status_code == 200
    consulta = client.get(f"/insumos/{insumo.id}/datos-nutricionales").json()
    sodio = next(d for d in consulta["datos"] if d["nutriente"] == "sodio")
    assert (sodio["valor"], sodio["fuente"], sodio["referencia"]) == (27000, "bibliografia", "Tabla de prueba")
