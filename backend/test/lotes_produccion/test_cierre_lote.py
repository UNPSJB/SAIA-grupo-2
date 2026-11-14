from datetime import date, datetime, time, timedelta

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.empleados.exceptions import EmpleadoNoEncontrado
from src.empleados.models import Empleado, RolEmpleado
from src.insumos.models import Insumo
from src.lotes_produccion import exceptions, schemas, services
from src.lotes_produccion.constants import ErrorCode
from src.lotes_produccion.models import LoteProduccion
from src.productos.constants import TipoProducto
from src.productos.models import Producto
from src.unidades_medida import services as unidades_services
from src.unidades_medida.models import UnidadMedida

URL = "/lotes-produccion"
AYER = datetime.combine(date.today() - timedelta(days=1), time(10, 30))


@pytest.fixture
def unidades(db_session: Session) -> dict:
    unidades_services.crear_catalogo(db_session)
    return {u.nombre: u for u in db_session.query(UnidadMedida).all()}


@pytest.fixture
def producto(db_session: Session, unidades: dict) -> Producto:
    producto = Producto(nombre="Prepizza", tipo=TipoProducto.ALIMENTO, stock=0, unidad_medida_id=unidades["Unidades"].id)
    db_session.add(producto)
    db_session.commit()
    return producto


@pytest.fixture
def empleado(db_session: Session) -> Empleado:
    empleado = Empleado(legajo="EMP-9100", dni="30100100", nombre="Maria", apellido="Perez", activo=True, rol=RolEmpleado.ADMIN)
    db_session.add(empleado)
    db_session.commit()
    return empleado


def _insumo(db: Session, nombre: str, unidad: UnidadMedida, stock: float) -> Insumo:
    insumo = Insumo(nombre=nombre, unidad_medida_id=unidad.id, cantidad=stock)
    db.add(insumo)
    db.commit()
    db.refresh(insumo)
    return insumo


@pytest.fixture
def harina(db_session: Session, unidades: dict) -> Insumo:
    return _insumo(db_session, "Harina 000", unidades["Kilogramos"], 200000.0)


@pytest.fixture
def aceite(db_session: Session, unidades: dict) -> Insumo:
    return _insumo(db_session, "Aceite de girasol", unidades["Litros"], 5000.0)


def _usado(insumo: Insumo, cantidad: float, unidad: UnidadMedida) -> dict:
    return {"insumo_id": insumo.id, "cantidad_utilizada": cantidad, "unidad_medida_id": unidad.id}


def _registrar(db: Session, producto: Producto, *insumos: dict) -> LoteProduccion:
    return services.crear_lote(
        db, schemas.LoteProduccionCreate(producto_id=producto.id, fecha=date.today(), cantidad=500, insumos=list(insumos))
    )


def _corregir(db: Session, lote: LoteProduccion, *insumos: dict) -> LoteProduccion:
    return services.corregir_consumo(db, lote.nro_lote, schemas.CorreccionConsumo(insumos=list(insumos)))


def _consumo(db: Session, lote: LoteProduccion) -> dict:
    return {d.nombre: d.cantidad_utilizada for d in services.listar_insumos_lote(db, lote.nro_lote)}


def _stock(db: Session, insumo: Insumo) -> float:
    db.refresh(insumo)
    return insumo.cantidad


def _de_ayer(db: Session, lote: LoteProduccion) -> LoteProduccion:
    lote.fecha_registro = AYER
    db.commit()
    return lote


def test_lote_nuevo_queda_abierto(db_session: Session, producto):
    antes = datetime.now()

    lote = _registrar(db_session, producto)

    assert lote.fecha_registro >= antes
    assert lote.cerrado is False
    assert lote.fecha_cierre_efectiva is None
    assert lote.cerrado_por is None


def test_corregir_consumo_descuenta_solo_la_diferencia(db_session: Session, producto, harina, unidades):
    lote = _registrar(db_session, producto, _usado(harina, 95, unidades["Kilogramos"]))

    _corregir(db_session, lote, _usado(harina, 96, unidades["Kilogramos"]))

    assert _consumo(db_session, lote) == {"Harina 000": 96000.0}
    assert _stock(db_session, harina) == 104000.0


def test_corregir_consumo_quita_y_agrega_insumos(db_session: Session, producto, harina, aceite, unidades):
    lote = _registrar(db_session, producto, _usado(harina, 10, unidades["Kilogramos"]))

    _corregir(db_session, lote, _usado(aceite, 500, unidades["Mililitros"]))

    assert _consumo(db_session, lote) == {"Aceite de girasol": 500.0}
    assert _stock(db_session, harina) == 200000.0
    assert _stock(db_session, aceite) == 4500.0


def test_corregir_consumo_a_vacio(db_session: Session, producto, harina, unidades):
    lote = _registrar(db_session, producto, _usado(harina, 10, unidades["Kilogramos"]))

    _corregir(db_session, lote)

    assert _consumo(db_session, lote) == {}
    assert _stock(db_session, harina) == 200000.0


def test_corregir_puede_usar_lo_que_devuelve_el_mismo_lote(db_session: Session, producto, aceite, unidades):
    lote = _registrar(db_session, producto, _usado(aceite, 5, unidades["Litros"]))

    _corregir(db_session, lote, _usado(aceite, 4, unidades["Litros"]))

    assert _stock(db_session, aceite) == 1000.0


def test_correccion_sin_stock_no_cambia_nada(db_session: Session, producto, harina, aceite, unidades):
    lote = _registrar(db_session, producto, _usado(harina, 95, unidades["Kilogramos"]))

    with pytest.raises(exceptions.StockInsuficiente):
        _corregir(db_session, lote, _usado(harina, 90, unidades["Kilogramos"]), _usado(aceite, 6, unidades["Litros"]))

    assert _consumo(db_session, lote) == {"Harina 000": 95000.0}
    assert _stock(db_session, harina) == 105000.0
    assert _stock(db_session, aceite) == 5000.0


def test_correccion_con_insumo_repetido(db_session: Session, producto, harina, unidades):
    lote = _registrar(db_session, producto, _usado(harina, 1, unidades["Kilogramos"]))

    with pytest.raises(exceptions.InsumoRepetido):
        _corregir(db_session, lote, _usado(harina, 1, unidades["Kilogramos"]), _usado(harina, 2, unidades["Gramos"]))

    assert _consumo(db_session, lote) == {"Harina 000": 1000.0}


def test_cerrar_lote_registra_quien_y_cuando(db_session: Session, producto, empleado):
    lote = _registrar(db_session, producto)
    antes = datetime.now()

    cerrado = services.cerrar_lote(db_session, lote.nro_lote, schemas.CierreLote(empleado_id=empleado.id))

    assert cerrado.cerrado is True
    assert cerrado.cerrado_por.id == empleado.id
    assert cerrado.fecha_cierre >= antes


def test_lote_cerrado_no_se_corrige_ni_se_vuelve_a_cerrar(db_session: Session, producto, harina, empleado, unidades):
    lote = _registrar(db_session, producto, _usado(harina, 95, unidades["Kilogramos"]))
    services.cerrar_lote(db_session, lote.nro_lote, schemas.CierreLote(empleado_id=empleado.id))

    with pytest.raises(exceptions.LoteCerrado):
        _corregir(db_session, lote, _usado(harina, 96, unidades["Kilogramos"]))
    with pytest.raises(exceptions.LoteCerrado):
        services.cerrar_lote(db_session, lote.nro_lote, schemas.CierreLote(empleado_id=empleado.id))

    assert _consumo(db_session, lote) == {"Harina 000": 95000.0}
    assert _stock(db_session, harina) == 105000.0


def test_cerrar_con_empleado_inexistente(db_session: Session, producto):
    lote = _registrar(db_session, producto)

    with pytest.raises(EmpleadoNoEncontrado):
        services.cerrar_lote(db_session, lote.nro_lote, schemas.CierreLote(empleado_id=999))

    assert services.leer_lote(db_session, lote.nro_lote).cerrado is False


def test_lote_de_un_dia_anterior_esta_cerrado(db_session: Session, producto, harina, empleado, unidades):
    lote = _de_ayer(db_session, _registrar(db_session, producto, _usado(harina, 95, unidades["Kilogramos"])))

    assert lote.cerrado is True
    assert lote.fecha_cierre_efectiva == datetime.combine(AYER.date(), time(23, 59, 59))
    with pytest.raises(exceptions.LoteCerrado):
        _corregir(db_session, lote, _usado(harina, 96, unidades["Kilogramos"]))
    with pytest.raises(exceptions.LoteCerrado):
        services.cerrar_lote(db_session, lote.nro_lote, schemas.CierreLote(empleado_id=empleado.id))


def test_cerrar_lotes_vencidos_solo_toca_los_abiertos_de_dias_anteriores(db_session: Session, producto, empleado):
    cerrado_a_mano = _de_ayer(
        db_session,
        services.cerrar_lote(
            db_session, _registrar(db_session, producto).nro_lote, schemas.CierreLote(empleado_id=empleado.id)
        ),
    )
    cierre_manual = cerrado_a_mano.fecha_cierre
    vencido = _de_ayer(db_session, _registrar(db_session, producto))
    de_hoy = _registrar(db_session, producto)

    assert services.cerrar_lotes_vencidos(db_session) == 1
    assert services.cerrar_lotes_vencidos(db_session) == 0

    assert vencido.fecha_cierre == datetime.combine(AYER.date(), time(23, 59, 59))
    assert vencido.cerrado_por is None
    assert de_hoy.fecha_cierre is None
    assert cerrado_a_mano.fecha_cierre == cierre_manual


def test_listar_lotes_persiste_el_cierre_automatico(db_session: Session, producto):
    lote = _de_ayer(db_session, _registrar(db_session, producto))
    assert lote.fecha_cierre is None

    services.listar_lotes(db_session)

    db_session.refresh(lote)
    assert lote.fecha_cierre == datetime.combine(AYER.date(), time(23, 59, 59))


def test_esquema_muestra_el_cierre_automatico_aunque_no_se_haya_guardado(db_session: Session, producto):
    lote = _de_ayer(db_session, _registrar(db_session, producto))

    datos = schemas.LoteProduccion.model_validate(lote)

    assert datos.cerrado is True
    assert datos.fecha_cierre == datetime.combine(AYER.date(), time(23, 59, 59))
    assert datos.cerrado_por is None


def test_router_corregir_y_cerrar(client: TestClient, producto, harina, empleado, unidades):
    lote = client.post(
        f"{URL}/",
        json={"producto_id": producto.id, "fecha": str(date.today()), "cantidad": 10, "insumos": [_usado(harina, 95, unidades["Kilogramos"])]},
    ).json()
    assert (lote["cerrado"], lote["fecha_cierre"], lote["cerrado_por"]) == (False, None, None)

    corregido = client.put(f"{URL}/{lote['nro_lote']}/insumos", json={"insumos": [_usado(harina, 96, unidades["Kilogramos"])]})
    cerrado = client.post(f"{URL}/{lote['nro_lote']}/cerrar", json={"empleado_id": empleado.id})
    otra_correccion = client.put(f"{URL}/{lote['nro_lote']}/insumos", json={"insumos": []})

    assert corregido.status_code == status.HTTP_200_OK
    assert client.get(f"{URL}/{lote['nro_lote']}/insumos").json()[0]["cantidad_utilizada"] == 96000.0
    assert cerrado.status_code == status.HTTP_200_OK
    assert cerrado.json()["cerrado"] is True
    assert cerrado.json()["cerrado_por"]["legajo"] == "EMP-9100"
    assert otra_correccion.status_code == status.HTTP_400_BAD_REQUEST
    assert otra_correccion.json()["detail"] == ErrorCode.LOTE_CERRADO


def test_router_historial_informa_estado(client: TestClient, db_session: Session, producto):
    _de_ayer(db_session, _registrar(db_session, producto))
    _registrar(db_session, producto)

    estados = [(lote["cerrado"], lote["cerrado_por"]) for lote in client.get(f"{URL}/").json()]

    assert sorted(estados, key=str) == [(False, None), (True, None)]
