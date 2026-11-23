from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.insumos.models import Insumo
from src.lotes_produccion import exceptions as lotes_exceptions
from src.lotes_produccion import schemas as lotes_schemas
from src.lotes_produccion import services as lotes_services
from src.productos.constants import TipoProducto
from src.productos.models import Producto
from src.recetas import exceptions, schemas, services
from src.recetas.models import DetalleReceta
from src.unidades_medida.constants import MagnitudUnidad
from src.unidades_medida.models import UnidadMedida

URL = "/recetas/producto/{}/escalar"


def _unidad(db: Session, nombre: str, magnitud: MagnitudUnidad, factor: float) -> UnidadMedida:
    unidad = db.scalar(select(UnidadMedida).where(UnidadMedida.nombre == nombre))
    if unidad is None:
        unidad = UnidadMedida(nombre=nombre, magnitud=magnitud, factor_base=factor)
        db.add(unidad)
        db.commit()
    return unidad


@pytest.fixture
def unidades(db_session: Session) -> dict:
    return {
        "g": _unidad(db_session, "Gramos", MagnitudUnidad.MASA, 1.0),
        "kg": _unidad(db_session, "Kilogramos", MagnitudUnidad.MASA, 1000.0),
        "ml": _unidad(db_session, "Mililitros", MagnitudUnidad.VOLUMEN, 1.0),
        "l": _unidad(db_session, "Litros", MagnitudUnidad.VOLUMEN, 1000.0),
        "u": _unidad(db_session, "Unidades", MagnitudUnidad.CANTIDAD, 1.0),
    }


@pytest.fixture
def insumos(db_session: Session, unidades) -> dict:
    creados = {
        "harina": Insumo(nombre="Harina", unidad_medida=unidades["kg"], cantidad=10000.0),
        "manteca": Insumo(nombre="Manteca", unidad_medida=unidades["kg"], cantidad=150.0),
        "leche": Insumo(nombre="Leche", unidad_medida=unidades["l"], cantidad=5000.0, densidad_g_ml=1.03),
    }
    db_session.add_all(creados.values())
    db_session.commit()
    return creados


def _producto(db: Session, nombre: str, unidad: UnidadMedida) -> Producto:
    producto = Producto(nombre=nombre, tipo=TipoProducto.ALIMENTO, unidad_medida=unidad)
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


def _renglon_receta(insumo: Insumo, cantidad: float, unidad: UnidadMedida) -> dict:
    return {
        "insumo_id": insumo.id,
        "cantidad_original": cantidad,
        "unidad_medida_id": unidad.id,
        "tipo_uso": "ingrediente",
    }


def _receta(db: Session, producto: Producto, insumos: dict, unidades: dict):
    """Rinde 1000 g en piezas de 50 g: 500 g de harina, 100 g de manteca y 200 ml de leche."""
    return services.crear_receta(
        db,
        schemas.RecetaCreate(
            producto_id=producto.id,
            version_inicial={
                "rendimiento_final_gramos": 1000,
                "unidad_venta_gramos": 50,
                "detalles": [
                    _renglon_receta(insumos["harina"], 500, unidades["g"]),
                    _renglon_receta(insumos["manteca"], 100, unidades["g"]),
                    _renglon_receta(insumos["leche"], 200, unidades["ml"]),
                ],
            },
        ),
    )


@pytest.fixture
def medialunas(db_session: Session, insumos, unidades) -> Producto:
    producto = _producto(db_session, "Medialunas", unidades["u"])
    _receta(db_session, producto, insumos, unidades)
    return producto


@pytest.fixture
def pan(db_session: Session, insumos, unidades) -> Producto:
    producto = _producto(db_session, "Pan", unidades["kg"])
    _receta(db_session, producto, insumos, unidades)
    return producto


def _escalar(db: Session, producto: Producto, **parametros) -> schemas.RecetaEscalada:
    return services.calcular_receta_escalada(db, producto.id, schemas.RecetaEscaladaBase(**parametros))


def _renglon(escalada: schemas.RecetaEscalada, nombre: str) -> schemas.RenglonEscalado:
    return next(r for r in escalada.renglones if r.insumo_nombre == nombre)


def test_escala_por_factor(db_session, medialunas):
    escalada = _escalar(db_session, medialunas, factor=2)
    assert escalada.factor_aplicado == 2
    assert escalada.rendimiento_esperado == 2000
    assert [(r.insumo_nombre, r.cantidad_original, r.cantidad_escalada) for r in escalada.renglones] == [
        ("Harina", 500, 1000),
        ("Manteca", 100, 200),
        ("Leche", 200, 400),
    ]


def test_escala_por_cantidad_objetivo_en_gramos(db_session, medialunas):
    escalada = _escalar(db_session, medialunas, cantidad_objetivo=2500)
    assert escalada.factor_aplicado == 2.5
    assert _renglon(escalada, "Harina").cantidad_escalada == 1250


def test_escala_por_cantidad_de_unidades(db_session, medialunas):
    escalada = _escalar(db_session, medialunas, unidades_objetivo=30)
    assert escalada.rendimiento_esperado == 1500
    assert escalada.factor_aplicado == 1.5
    assert escalada.cantidad_producto == 30


@pytest.mark.parametrize(
    "parametros",
    [
        {},
        {"factor": 2, "cantidad_objetivo": 500},
        {"factor": 2, "unidades_objetivo": 3},
        {"cantidad_objetivo": 1, "unidades_objetivo": 1},
    ],
)
def test_exige_un_solo_parametro(db_session, medialunas, parametros):
    with pytest.raises(exceptions.ParametrosEscaladoInvalidos):
        _escalar(db_session, medialunas, **parametros)


def test_producto_sin_receta_vigente(db_session, unidades):
    producto = _producto(db_session, "Sin receta", unidades["u"])
    with pytest.raises(exceptions.RecetaVigenteNoEncontrada):
        _escalar(db_session, producto, factor=1)


def test_cada_renglon_sale_en_la_unidad_de_la_receta(db_session, medialunas, unidades):
    leche = _renglon(_escalar(db_session, medialunas, factor=1), "Leche")
    assert leche.unidad_medida_id == unidades["ml"].id
    assert leche.unidad_medida_nombre == "Mililitros"
    assert leche.magnitud == MagnitudUnidad.VOLUMEN
    assert leche.stock_disponible == 5000


def test_compara_el_stock_en_la_unidad_base(db_session, medialunas):
    escalada = _escalar(db_session, medialunas, factor=1)
    assert _renglon(escalada, "Manteca").stock_suficiente is True
    assert _renglon(escalada, "Leche").stock_suficiente is True
    escalada = _escalar(db_session, medialunas, factor=2)
    assert _renglon(escalada, "Manteca").stock_suficiente is False


def test_cantidad_del_lote_en_la_unidad_del_producto(db_session, medialunas, pan):
    assert _escalar(db_session, medialunas, factor=2).cantidad_producto == 40
    assert _escalar(db_session, medialunas, factor=2).unidad_producto_nombre == "Unidades"
    por_kilo = _escalar(db_session, pan, cantidad_objetivo=5000)
    assert por_kilo.cantidad_producto == 5
    assert por_kilo.unidad_producto_nombre == "Kilogramos"


def test_un_producto_medido_en_volumen_no_trae_cantidad(db_session, insumos, unidades):
    jugo = _producto(db_session, "Jugo", unidades["l"])
    _receta(db_session, jugo, insumos, unidades)
    escalada = _escalar(db_session, jugo, factor=1)
    assert escalada.cantidad_producto is None
    assert escalada.unidad_producto_nombre == "Litros"


def test_escalar_no_modifica_la_receta(db_session, medialunas):
    antes = db_session.execute(select(DetalleReceta.cantidad_original, DetalleReceta.cantidad_gramos)).all()
    _escalar(db_session, medialunas, factor=3)
    assert db_session.execute(select(DetalleReceta.cantidad_original, DetalleReceta.cantidad_gramos)).all() == antes


def _lote_desde(escalada: schemas.RecetaEscalada) -> dict:
    return {
        "producto_id": escalada.producto_id,
        "fecha": date.today().isoformat(),
        "cantidad": escalada.cantidad_producto,
        "receta_id": escalada.receta_id,
        "receta_version_id": escalada.receta_version_id,
        "factor_escalado": escalada.factor_aplicado,
        "insumos": [
            {
                "insumo_id": r.insumo_id,
                "cantidad_utilizada": r.cantidad_escalada,
                "unidad_medida_id": r.unidad_medida_id,
            }
            for r in escalada.renglones
        ],
    }


def test_el_lote_precargado_se_puede_registrar(client, db_session, medialunas, insumos):
    respuesta = client.post(URL.format(medialunas.id), json={"factor": 1})
    assert respuesta.status_code == 200
    escalada = schemas.RecetaEscalada(**respuesta.json())

    lote = client.post("/lotes-produccion/", json=_lote_desde(escalada))
    assert lote.status_code == 200, lote.text
    assert lote.json()["cantidad"] == 20
    db_session.refresh(insumos["leche"])
    db_session.refresh(insumos["harina"])
    assert insumos["leche"].cantidad == 4800
    assert insumos["harina"].cantidad == 9500


def test_endpoint_rechaza_parametros_combinados(client, medialunas):
    respuesta = client.post(URL.format(medialunas.id), json={"factor": 2, "unidades_objetivo": 4})
    assert respuesta.status_code == 400


def test_un_lote_no_acepta_la_receta_de_otro_producto(db_session, medialunas, pan):
    escalada = _escalar(db_session, medialunas, factor=1)
    datos = _lote_desde(escalada) | {"producto_id": pan.id, "cantidad": 1, "insumos": []}
    with pytest.raises(lotes_exceptions.RecetaDeOtroProducto):
        lotes_services.crear_lote(db_session, lotes_schemas.LoteProduccionCreate(**datos))


def test_un_lote_no_acepta_receta_sin_version(db_session, medialunas):
    escalada = _escalar(db_session, medialunas, factor=1)
    datos = _lote_desde(escalada) | {"receta_version_id": None, "insumos": []}
    with pytest.raises(lotes_exceptions.RecetaIncompleta):
        lotes_services.crear_lote(db_session, lotes_schemas.LoteProduccionCreate(**datos))
