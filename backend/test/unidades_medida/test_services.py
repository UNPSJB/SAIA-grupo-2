import pytest
from sqlalchemy.orm import Session

from src.unidades_medida import exceptions, services
from src.unidades_medida.constants import CATALOGO_UNIDADES, MagnitudUnidad
from src.unidades_medida.models import UnidadMedida


def test_crear_catalogo_carga_las_cinco_unidades(db_session: Session):
    agregadas = services.crear_catalogo(db_session)

    unidades = services.listar_unidades_medida(db_session)
    assert agregadas == len(CATALOGO_UNIDADES) == 5
    assert [u.nombre for u in unidades] == ["Gramos", "Kilogramos", "Mililitros", "Litros", "Unidades"]
    kilos = unidades[1]
    assert (kilos.magnitud, kilos.factor_base) == (MagnitudUnidad.MASA, 1000.0)


def test_crear_catalogo_no_duplica_las_existentes(db_session: Session):
    db_session.add(UnidadMedida(nombre="Gramos", magnitud=MagnitudUnidad.MASA, factor_base=1.0))
    db_session.commit()

    assert services.crear_catalogo(db_session) == 4
    assert services.crear_catalogo(db_session) == 0
    assert len(services.listar_unidades_medida(db_session)) == 5


def test_leer_unidad_medida(db_session: Session):
    services.crear_catalogo(db_session)
    litros = services.listar_unidades_medida(db_session)[3]

    assert services.leer_unidad_medida(db_session, litros.id).nombre == "Litros"


def test_leer_unidad_medida_inexistente(db_session: Session):
    with pytest.raises(exceptions.UnidadMedidaNoEncontrada):
        services.leer_unidad_medida(db_session, 999)


def test_unidad_base_de_cada_magnitud(db_session: Session):
    services.crear_catalogo(db_session)

    assert services.unidad_base(db_session, MagnitudUnidad.MASA).nombre == "Gramos"
    assert services.unidad_base(db_session, MagnitudUnidad.VOLUMEN).nombre == "Mililitros"


def test_unidad_base_sin_catalogo(db_session: Session):
    with pytest.raises(exceptions.UnidadMedidaNoEncontrada):
        services.unidad_base(db_session, MagnitudUnidad.MASA)


def test_convertir_a_base_redondea_a_dos_decimales():
    kilos = UnidadMedida(nombre="Kilogramos", magnitud=MagnitudUnidad.MASA, factor_base=1000.0)
    gramos = UnidadMedida(nombre="Gramos", magnitud=MagnitudUnidad.MASA, factor_base=1.0)

    assert services.convertir_a_base(1.2345, kilos) == 1234.5
    assert services.convertir_a_base(0.123456, kilos) == 123.46
    assert services.convertir_a_base(250, gramos) == 250
