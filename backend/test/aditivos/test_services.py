import pytest
from sqlalchemy.orm import Session
from src.aditivos import services, schemas, exceptions

def test_crear_y_listar_clase_funcional(db_session: Session):
    cf = services.crear_clase_funcional_aditivo(
        db_session,
        schemas.ClaseFuncionalAditivoCreate(nombre="Conservante Test", necesita_ins=True)
    )
    assert cf.id is not None
    assert cf.nombre.lower() == "conservante test"

    clases = services.listar_clases_funcionales_aditivos(db_session)
    assert any(c.nombre.lower() == "conservante test" for c in clases)

def test_crear_clase_funcional_duplicada_falla(db_session: Session):
    services.crear_clase_funcional_aditivo(
        db_session,
        schemas.ClaseFuncionalAditivoCreate(nombre="Antioxidante Test", necesita_ins=True)
    )
    with pytest.raises(exceptions.ClaseFuncionalDuplicada):
        services.crear_clase_funcional_aditivo(
            db_session,
            schemas.ClaseFuncionalAditivoCreate(nombre="Antioxidante Test", necesita_ins=True)
        )

def test_crear_y_leer_aditivo(db_session: Session):
    cf = services.crear_clase_funcional_aditivo(
        db_session,
        schemas.ClaseFuncionalAditivoCreate(nombre="Colorante Test", necesita_ins=True)
    )
    ad = services.crear_aditivo(
        db_session,
        schemas.AditivoCreate(
            nombre_completo="Tartrazina",
            clase_funcional_id=cf.id,
            numero_ins="102"
        )
    )
    assert ad.id is not None
    assert ad.nombre_completo == "Tartrazina"

    leido = services.leer_aditivo(db_session, ad.id)
    assert leido.nombre_completo == "Tartrazina"
