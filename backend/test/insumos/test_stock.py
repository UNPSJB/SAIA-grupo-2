import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.insumos import exceptions, schemas, services
from src.insumos.constants import ErrorCode
from src.insumos.models import Insumo
from src.unidades_medida.exceptions import UnidadMedidaNoEncontrada


def _sumar(db: Session, insumo: Insumo, cantidad: float, unidad) -> Insumo:
    return services.sumar_stock(db, insumo.id, schemas.InsumoAgregarStock(cantidad=cantidad, unidad_medida_id=unidad.id))


def test_sumar_stock_en_kilos_se_guarda_en_gramos(db_session: Session, harina: Insumo, unidades: dict):
    _sumar(db_session, harina, 2.5, unidades["Kilogramos"])
    actualizado = _sumar(db_session, harina, 250, unidades["Gramos"])

    assert actualizado.cantidad == 2750.0


def test_sumar_stock_en_litros_se_guarda_en_mililitros(db_session: Session, leche: Insumo, unidades: dict):
    assert _sumar(db_session, leche, 1.25, unidades["Litros"]).cantidad == 1250.0


def test_sumar_stock_con_unidad_de_otra_magnitud(db_session: Session, harina: Insumo, unidades: dict):
    with pytest.raises(exceptions.UnidadIncompatible):
        _sumar(db_session, harina, 1, unidades["Litros"])
    with pytest.raises(exceptions.UnidadIncompatible):
        _sumar(db_session, harina, 1, unidades["Unidades"])

    db_session.refresh(harina)
    assert harina.cantidad == 0.0


@pytest.mark.parametrize("cantidad", [0, -1])
def test_sumar_stock_cantidad_invalida(db_session: Session, harina: Insumo, unidades: dict, cantidad: float):
    with pytest.raises(exceptions.CantidadInvalida):
        _sumar(db_session, harina, cantidad, unidades["Gramos"])


def test_sumar_stock_unidad_inexistente(db_session: Session, harina: Insumo):
    with pytest.raises(UnidadMedidaNoEncontrada):
        services.sumar_stock(db_session, harina.id, schemas.InsumoAgregarStock(cantidad=1, unidad_medida_id=999))


def test_crear_insumo_en_unidades_no_esta_permitido(db_session: Session, unidades: dict):
    with pytest.raises(exceptions.UnidadNoPermitida):
        services.crear_insumo(
            db_session, schemas.InsumoCreate(nombre="Huevos", unidad_medida_id=unidades["Unidades"].id)
        )


def test_crear_insumo_con_unidad_inexistente(db_session: Session, unidades: dict):
    with pytest.raises(UnidadMedidaNoEncontrada):
        services.crear_insumo(db_session, schemas.InsumoCreate(nombre="Sal", unidad_medida_id=999))


def test_crear_insumo_arranca_sin_stock(db_session: Session, unidades: dict):
    insumo = services.crear_insumo(
        db_session, schemas.InsumoCreate(nombre="Sal fina", unidad_medida_id=unidades["Kilogramos"].id)
    )

    assert insumo.cantidad == 0.0


def test_modificar_insumo_no_toca_el_stock(db_session: Session, harina: Insumo, unidades: dict):
    _sumar(db_session, harina, 3, unidades["Kilogramos"])

    modificado = services.modificar_insumo(
        db_session, harina.id, schemas.InsumoUpdate(nombre="Harina 0000", unidad_medida_id=unidades["Gramos"].id)
    )

    assert modificado.nombre == "Harina 0000"
    assert modificado.cantidad == 3000.0


def test_modificar_insumo_a_otra_magnitud_con_stock(db_session: Session, harina: Insumo, unidades: dict):
    _sumar(db_session, harina, 1, unidades["Gramos"])

    with pytest.raises(exceptions.CambioDeMagnitudConStock):
        services.modificar_insumo(
            db_session, harina.id, schemas.InsumoUpdate(nombre="Harina 000", unidad_medida_id=unidades["Litros"].id)
        )


def test_modificar_insumo_a_otra_magnitud_sin_stock(db_session: Session, harina: Insumo, unidades: dict):
    modificado = services.modificar_insumo(
        db_session, harina.id, schemas.InsumoUpdate(nombre="Harina 000", unidad_medida_id=unidades["Litros"].id)
    )

    assert modificado.unidad_medida.nombre == "Litros"


def test_modificar_insumo_a_unidades_no_esta_permitido(db_session: Session, harina: Insumo, unidades: dict):
    with pytest.raises(exceptions.UnidadNoPermitida):
        services.modificar_insumo(
            db_session, harina.id, schemas.InsumoUpdate(nombre="Harina 000", unidad_medida_id=unidades["Unidades"].id)
        )


def test_router_agregar_stock(client: TestClient, harina: Insumo, unidades: dict):
    respuesta = client.patch(
        f"/insumos/{harina.id}/agregar-stock", json={"cantidad": 1.5, "unidad_medida_id": unidades["Kilogramos"].id}
    )

    assert respuesta.status_code == status.HTTP_200_OK
    cuerpo = respuesta.json()
    assert cuerpo["cantidad"] == 1500.0
    assert cuerpo["unidad_medida"]["magnitud"] == "masa"


def test_router_agregar_stock_unidad_incompatible(client: TestClient, harina: Insumo, unidades: dict):
    respuesta = client.patch(
        f"/insumos/{harina.id}/agregar-stock", json={"cantidad": 1, "unidad_medida_id": unidades["Mililitros"].id}
    )

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == ErrorCode.UNIDAD_INCOMPATIBLE


def test_router_agregar_stock_sin_unidad(client: TestClient, harina: Insumo):
    respuesta = client.patch(f"/insumos/{harina.id}/agregar-stock", json={"cantidad": 1})

    assert respuesta.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_router_crear_insumo_en_unidades(client: TestClient, unidades: dict):
    respuesta = client.post("/insumos/", json={"nombre": "Huevos", "unidad_medida_id": unidades["Unidades"].id})

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == ErrorCode.UNIDAD_NO_PERMITIDA
