from datetime import timedelta

import pytest
from sqlalchemy.orm import Session

from src.archivos import exceptions as archivos_exceptions
from src.archivos.constants import CARACTERES_MAXIMOS
from src.empleados import exceptions as empleados_exceptions
from src.empleados.models import Empleado, RolEmpleado
from src.incidentes import exceptions, models, schemas, services
from src.incidentes.constants import EstadoIncidente, TipoIncidente, TipoMovimiento

FOTO_VALIDA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="


def _crear_empleado(
    db: Session,
    legajo: str = "EMP-9000",
    dni: str = "40000000",
    nombre: str = "empleado",
    apellido: str = "test",
    rol: RolEmpleado = RolEmpleado.OPERARIO,
) -> Empleado:
    """Crea un empleado directo en la BD para usarlo como quien reporta o resuelve."""
    empleado = Empleado(
        legajo=legajo,
        dni=dni,
        nombre=nombre,
        apellido=apellido,
        activo=True,
        rol=rol,
    )
    db.add(empleado)
    db.commit()
    db.refresh(empleado)
    return empleado


def _crear_incidente(
    db: Session,
    empleado: Empleado,
    descripcion: str = "incidente test",
    tipo: TipoIncidente = TipoIncidente.OTRO,
    dias_atras: int = 0,
) -> models.Incidente:
    """Crea un incidente por el servicio y lo antigua para poder probar orden y antiguedad."""
    incidente = services.crear_incidente(
        db,
        schemas.IncidenteCreate(
            descripcion=descripcion,
            empleado_id=empleado.id,
            tipo=tipo,
        ),
    )
    if dias_atras:
        incidente.fecha_hora_reporte = models.ahora() - timedelta(days=dias_atras)
        db.commit()
        db.refresh(incidente)
    return incidente


# PRUEBAS POSITIVAS (CASOS DE ÉXITO - SERVICES)

def test_crear_incidente_exito(db_session: Session):
    """Verifica que al registrar un incidente el servidor complete fecha, hora y estado."""
    empleado = _crear_empleado(db_session)
    data = schemas.IncidenteCreate(
        descripcion="se rompio el burlete de la camara 2",
        empleado_id=empleado.id,
    )

    incidente = services.crear_incidente(db_session, data)
    assert incidente.id is not None
    assert incidente.descripcion == "se rompio el burlete de la camara 2"
    assert incidente.empleado_id == empleado.id
    assert incidente.estado == EstadoIncidente.ABIERTO
    assert incidente.tipo == TipoIncidente.OTRO
    assert incidente.fecha_hora_reporte is not None
    assert incidente.accion_correctiva is None
    assert incidente.fecha_cierre is None


def test_crear_incidente_con_tipo_y_foto(db_session: Session):
    """Verifica que se guarden el tipo elegido y la foto opcional."""
    empleado = _crear_empleado(db_session)
    data = schemas.IncidenteCreate(
        descripcion="heces de roedor detras del estante",
        empleado_id=empleado.id,
        tipo=TipoIncidente.PLAGA,
        archivo_url=FOTO_VALIDA,
        archivo_nombre="plaga.png",
    )

    incidente = services.crear_incidente(db_session, data)
    assert incidente.tipo == TipoIncidente.PLAGA
    assert incidente.archivo_url == FOTO_VALIDA
    assert incidente.archivo_nombre == "plaga.png"


def test_crear_incidente_sin_foto_queda_sin_archivo(db_session: Session):
    """Verifica que la foto sea realmente opcional al registrar."""
    empleado = _crear_empleado(db_session)
    incidente = _crear_incidente(db_session, empleado)

    assert incidente.archivo_url is None
    assert incidente.archivo_nombre is None


def test_listar_incidentes_vacio_y_con_datos(db_session: Session):
    """Verifica listar incidentes sin datos y con varios cargados."""
    assert services.listar_incidentes(db_session) == []

    empleado = _crear_empleado(db_session)
    _crear_incidente(db_session, empleado, "incidente 1 test")
    _crear_incidente(db_session, empleado, "incidente 2 test")

    assert len(services.listar_incidentes(db_session)) == 2


def test_listar_incidentes_ordenado_por_fecha_descendente(db_session: Session):
    """Verifica el CA del listado general: todos los incidentes ordenados por fecha."""
    empleado = _crear_empleado(db_session)
    _crear_incidente(db_session, empleado, "el mas viejo test", dias_atras=20)
    _crear_incidente(db_session, empleado, "intermedio test", dias_atras=5)
    _crear_incidente(db_session, empleado, "el mas nuevo test", dias_atras=0)

    lista = services.listar_incidentes(db_session)
    assert [i.descripcion for i in lista] == [
        "el mas nuevo test",
        "intermedio test",
        "el mas viejo test",
    ]


def test_listar_incidentes_filtra_por_estado(db_session: Session):
    """Verifica el filtro por estado del listado general."""
    empleado = _crear_empleado(db_session)
    abierto = _crear_incidente(db_session, empleado, "sigue abierto test")
    cerrado = _crear_incidente(db_session, empleado, "ya resuelto test")
    services.cerrar_incidente(
        db_session,
        cerrado.id,
        schemas.CierreIncidente(accion_correctiva="se reemplazo la pieza", responsable_id=empleado.id),
    )

    solo_abiertos = services.listar_incidentes(db_session, estado=EstadoIncidente.ABIERTO)
    assert [i.id for i in solo_abiertos] == [abierto.id]

    solo_cerrados = services.listar_incidentes(db_session, estado=EstadoIncidente.CERRADO)
    assert [i.id for i in solo_cerrados] == [cerrado.id]


def test_listar_incidentes_filtra_por_tipo(db_session: Session):
    """Verifica el filtro por tipo del listado general."""
    empleado = _crear_empleado(db_session)
    rotura = _crear_incidente(db_session, empleado, "rotura test", tipo=TipoIncidente.ROTURA)
    _crear_incidente(db_session, empleado, "plaga test", tipo=TipoIncidente.PLAGA)

    lista = services.listar_incidentes(db_session, tipo=TipoIncidente.ROTURA)
    assert [i.id for i in lista] == [rotura.id]


def test_listar_incidentes_filtra_por_empleado(db_session: Session):
    """Verifica el filtro por quien reporto el incidente."""
    uno = _crear_empleado(db_session, legajo="EMP-9001", dni="40000001")
    otro = _crear_empleado(db_session, legajo="EMP-9002", dni="40000002")
    suyo = _crear_incidente(db_session, uno, "reportado por uno test")
    _crear_incidente(db_session, otro, "reportado por otro test")

    lista = services.listar_incidentes(db_session, empleado_id=uno.id)
    assert [i.id for i in lista] == [suyo.id]


def test_leer_incidente_exito(db_session: Session):
    """Verifica leer un incidente por ID."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado, "incidente a leer test")

    leido = services.leer_incidente(db_session, creado.id)
    assert leido.id == creado.id
    assert leido.descripcion == "incidente a leer test"


def test_adjuntar_foto_exito(db_session: Session):
    """Verifica que se pueda completar la foto despues de registrar el incidente."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado)

    actualizado = services.adjuntar_foto(
        db_session,
        creado.id,
        schemas.FotoIncidente(archivo_url=FOTO_VALIDA, archivo_nombre="tardia.png"),
    )
    assert actualizado.archivo_url == FOTO_VALIDA
    assert actualizado.archivo_nombre == "tardia.png"


def test_adjuntar_foto_no_altera_el_resto_del_incidente(db_session: Session):
    """Verifica que adjuntar la foto sea la unica modificacion y no toque descripcion ni estado."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado, "descripcion original test")

    actualizado = services.adjuntar_foto(
        db_session, creado.id, schemas.FotoIncidente(archivo_url=FOTO_VALIDA)
    )
    assert actualizado.descripcion == "descripcion original test"
    assert actualizado.estado == EstadoIncidente.ABIERTO


def test_listar_abiertos_excluye_cerrados(db_session: Session):
    """Verifica el CA de incidentes abiertos: solo los que siguen sin resolver."""
    empleado = _crear_empleado(db_session)
    abierto = _crear_incidente(db_session, empleado, "pendiente test")
    cerrado = _crear_incidente(db_session, empleado, "resuelto test")
    services.cerrar_incidente(
        db_session,
        cerrado.id,
        schemas.CierreIncidente(accion_correctiva="se corrigio en el momento", responsable_id=empleado.id),
    )

    abiertos = services.listar_abiertos(db_session)
    assert [i.id for i in abiertos] == [abierto.id]


def test_listar_abiertos_ordena_mas_antiguos_primero(db_session: Session):
    """Verifica que los incidentes abiertos se prioricen por antiguedad."""
    empleado = _crear_empleado(db_session)
    _crear_incidente(db_session, empleado, "reciente test", dias_atras=1)
    _crear_incidente(db_session, empleado, "antiguo test", dias_atras=30)
    _crear_incidente(db_session, empleado, "medio test", dias_atras=10)

    abiertos = services.listar_abiertos(db_session)
    assert [i.descripcion for i in abiertos] == ["antiguo test", "medio test", "reciente test"]


def test_cerrar_incidente_exito(db_session: Session):
    """Verifica que registrar la accion correctiva deje el incidente cerrado."""
    empleado = _crear_empleado(db_session)
    responsable = _crear_empleado(
        db_session, legajo="EMP-9003", dni="40000003", rol=RolEmpleado.ADMIN
    )
    creado = _crear_incidente(db_session, empleado)

    cerrado = services.cerrar_incidente(
        db_session,
        creado.id,
        schemas.CierreIncidente(
            accion_correctiva="se cambio el burlete y se agrego al checklist",
            responsable_id=responsable.id,
        ),
    )
    assert cerrado.estado == EstadoIncidente.CERRADO
    assert cerrado.accion_correctiva == "se cambio el burlete y se agrego al checklist"
    assert cerrado.fecha_cierre is not None
    assert cerrado.responsable_cierre_id == responsable.id


def test_cerrar_incidente_registra_movimiento(db_session: Session):
    """Verifica que el cierre quede asentado en el historial de movimientos."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado)

    cerrado = services.cerrar_incidente(
        db_session,
        creado.id,
        schemas.CierreIncidente(accion_correctiva="se ajusto el equipo", responsable_id=empleado.id),
    )
    assert len(cerrado.movimientos) == 1
    movimiento = cerrado.movimientos[0]
    assert movimiento.tipo == TipoMovimiento.CIERRE
    assert movimiento.descripcion == "se ajusto el equipo"
    assert movimiento.empleado_id == empleado.id


def test_reabrir_incidente_exito(db_session: Session):
    """Verifica que reabrir vuelva el incidente a abierto y limpie los datos del cierre."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado)
    services.cerrar_incidente(
        db_session,
        creado.id,
        schemas.CierreIncidente(accion_correctiva="se creyo resuelto", responsable_id=empleado.id),
    )

    reabierto = services.reabrir_incidente(
        db_session,
        creado.id,
        schemas.ReaperturaIncidente(motivo="el problema volvio a aparecer", responsable_id=empleado.id),
    )
    assert reabierto.estado == EstadoIncidente.ABIERTO
    assert reabierto.accion_correctiva is None
    assert reabierto.fecha_cierre is None
    assert reabierto.responsable_cierre_id is None


def test_reabrir_incidente_conserva_la_accion_correctiva_en_el_historial(db_session: Session):
    """Verifica que la accion correctiva anterior no se pierda al reabrir."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado)
    services.cerrar_incidente(
        db_session,
        creado.id,
        schemas.CierreIncidente(accion_correctiva="se sello la junta", responsable_id=empleado.id),
    )

    reabierto = services.reabrir_incidente(
        db_session,
        creado.id,
        schemas.ReaperturaIncidente(motivo="volvio a filtrar agua", responsable_id=empleado.id),
    )
    assert len(reabierto.movimientos) == 2
    assert reabierto.movimientos[0].tipo == TipoMovimiento.CIERRE
    assert reabierto.movimientos[0].descripcion == "se sello la junta"
    assert reabierto.movimientos[1].tipo == TipoMovimiento.REAPERTURA
    assert reabierto.movimientos[1].descripcion == "volvio a filtrar agua"


def test_reabrir_incidente_sin_limite_de_ciclos(db_session: Session):
    """Verifica que un incidente se pueda cerrar y reabrir varias veces."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado)

    for vuelta in range(3):
        services.cerrar_incidente(
            db_session,
            creado.id,
            schemas.CierreIncidente(
                accion_correctiva=f"intento de solucion {vuelta}", responsable_id=empleado.id
            ),
        )
        services.reabrir_incidente(
            db_session,
            creado.id,
            schemas.ReaperturaIncidente(
                motivo=f"no funciono la vuelta {vuelta}", responsable_id=empleado.id
            ),
        )

    final = services.leer_incidente(db_session, creado.id)
    assert final.estado == EstadoIncidente.ABIERTO
    assert len(final.movimientos) == 6


def test_dias_abierto_se_calcula_mientras_sigue_abierto(db_session: Session):
    """Verifica la antiguedad que muestra el listado de abiertos."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado, dias_atras=20)

    assert creado.dias_abierto == 20


def test_dias_abierto_es_none_cuando_esta_cerrado(db_session: Session):
    """Verifica que un incidente cerrado deje de acumular antiguedad."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado, dias_atras=20)

    cerrado = services.cerrar_incidente(
        db_session,
        creado.id,
        schemas.CierreIncidente(accion_correctiva="se resolvio finalmente", responsable_id=empleado.id),
    )
    assert cerrado.dias_abierto is None


def test_resumen_incidentes_cuenta_abiertos_cerrados_y_total(db_session: Session):
    """Verifica los conteos que alimentan el tablero de incidentes."""
    empleado = _crear_empleado(db_session)
    _crear_incidente(db_session, empleado, "abierto 1 test", tipo=TipoIncidente.ROTURA)
    _crear_incidente(db_session, empleado, "abierto 2 test", tipo=TipoIncidente.ROTURA)
    _crear_incidente(db_session, empleado, "abierto 3 test", tipo=TipoIncidente.PLAGA)
    a_cerrar = _crear_incidente(db_session, empleado, "a cerrar test", tipo=TipoIncidente.OTRO)
    services.cerrar_incidente(
        db_session,
        a_cerrar.id,
        schemas.CierreIncidente(accion_correctiva="se normalizo el proceso", responsable_id=empleado.id),
    )

    resumen = services.resumen_incidentes(db_session)
    assert resumen.abiertos == 3
    assert resumen.cerrados == 1
    assert resumen.total == 4

    conteos = {c.tipo: c.cantidad for c in resumen.abiertos_por_tipo}
    assert conteos[TipoIncidente.ROTURA] == 2
    assert conteos[TipoIncidente.PLAGA] == 1
    assert conteos[TipoIncidente.DEVOLUCION_CLIENTE] == 0
    assert conteos[TipoIncidente.OTRO] == 0


def test_resumen_incidentes_informa_todos_los_tipos(db_session: Session):
    """Verifica que el resumen liste cada tipo aunque no tenga incidentes abiertos."""
    resumen = services.resumen_incidentes(db_session)

    assert resumen.total == 0
    assert len(resumen.abiertos_por_tipo) == len(TipoIncidente)


# PRUEBAS NEGATIVAS (CASOS DE FALLA - SERVICES)

def test_crear_incidente_empleado_inexistente(db_session: Session):
    """Verifica que registrar un incidente de un empleado inexistente lance EmpleadoNoEncontrado."""
    data = schemas.IncidenteCreate(descripcion="incidente huerfano test", empleado_id=9999)

    with pytest.raises(empleados_exceptions.EmpleadoNoEncontrado):
        services.crear_incidente(db_session, data)


def test_crear_incidente_archivo_formato_invalido(db_session: Session):
    """Verifica que una foto que no sea imagen ni PDF lance ArchivoFormatoInvalido."""
    empleado = _crear_empleado(db_session)
    data = schemas.IncidenteCreate(
        descripcion="incidente con adjunto raro test",
        empleado_id=empleado.id,
        archivo_url="data:text/plain;base64,aG9sYQ==",
    )

    with pytest.raises(archivos_exceptions.ArchivoFormatoInvalido):
        services.crear_incidente(db_session, data)


def test_crear_incidente_archivo_demasiado_grande(db_session: Session):
    """Verifica que una foto que supere el tamanio permitido lance ArchivoDemasiadoGrande."""
    empleado = _crear_empleado(db_session)
    data = schemas.IncidenteCreate(
        descripcion="incidente con adjunto pesado test",
        empleado_id=empleado.id,
        archivo_url="data:image/png;base64," + "A" * CARACTERES_MAXIMOS,
    )

    with pytest.raises(archivos_exceptions.ArchivoDemasiadoGrande):
        services.crear_incidente(db_session, data)


def test_leer_incidente_inexistente(db_session: Session):
    """Verifica que leer un incidente por ID inexistente lance IncidenteNoEncontrado."""
    with pytest.raises(exceptions.IncidenteNoEncontrado):
        services.leer_incidente(db_session, 9999)


def test_adjuntar_foto_incidente_inexistente(db_session: Session):
    """Verifica que adjuntar una foto a un incidente inexistente lance IncidenteNoEncontrado."""
    with pytest.raises(exceptions.IncidenteNoEncontrado):
        services.adjuntar_foto(db_session, 9999, schemas.FotoIncidente(archivo_url=FOTO_VALIDA))


def test_adjuntar_foto_cuando_ya_tiene_una(db_session: Session):
    """Verifica que no se pueda reemplazar una foto ya cargada."""
    empleado = _crear_empleado(db_session)
    creado = services.crear_incidente(
        db_session,
        schemas.IncidenteCreate(
            descripcion="incidente con foto test",
            empleado_id=empleado.id,
            archivo_url=FOTO_VALIDA,
        ),
    )

    with pytest.raises(exceptions.FotoYaCargada):
        services.adjuntar_foto(db_session, creado.id, schemas.FotoIncidente(archivo_url=FOTO_VALIDA))


def test_adjuntar_foto_vacia(db_session: Session):
    """Verifica que adjuntar una foto sin contenido lance FotoRequerida."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado)

    with pytest.raises(exceptions.FotoRequerida):
        services.adjuntar_foto(db_session, creado.id, schemas.FotoIncidente(archivo_url=""))


def test_adjuntar_foto_formato_invalido(db_session: Session):
    """Verifica que adjuntar un archivo que no sea imagen ni PDF lance ArchivoFormatoInvalido."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado)

    with pytest.raises(archivos_exceptions.ArchivoFormatoInvalido):
        services.adjuntar_foto(
            db_session,
            creado.id,
            schemas.FotoIncidente(archivo_url="data:text/plain;base64,aG9sYQ=="),
        )


def test_cerrar_incidente_inexistente(db_session: Session):
    """Verifica que cerrar un incidente inexistente lance IncidenteNoEncontrado."""
    empleado = _crear_empleado(db_session)
    cierre = schemas.CierreIncidente(accion_correctiva="accion test", responsable_id=empleado.id)

    with pytest.raises(exceptions.IncidenteNoEncontrado):
        services.cerrar_incidente(db_session, 9999, cierre)


def test_cerrar_incidente_ya_cerrado(db_session: Session):
    """Verifica que no se pueda cerrar dos veces el mismo incidente."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado)
    cierre = schemas.CierreIncidente(
        accion_correctiva="se resolvio en planta", responsable_id=empleado.id
    )
    services.cerrar_incidente(db_session, creado.id, cierre)

    with pytest.raises(exceptions.IncidenteYaCerrado):
        services.cerrar_incidente(db_session, creado.id, cierre)


def test_cerrar_incidente_sin_accion_correctiva(db_session: Session):
    """Verifica que una accion correctiva en blanco lance AccionCorrectivaRequerida."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado)

    with pytest.raises(exceptions.AccionCorrectivaRequerida):
        services.cerrar_incidente(
            db_session,
            creado.id,
            schemas.CierreIncidente(accion_correctiva="   ", responsable_id=empleado.id),
        )


def test_cerrar_incidente_responsable_inexistente(db_session: Session):
    """Verifica que un responsable de cierre inexistente lance EmpleadoNoEncontrado."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado)

    with pytest.raises(empleados_exceptions.EmpleadoNoEncontrado):
        services.cerrar_incidente(
            db_session,
            creado.id,
            schemas.CierreIncidente(accion_correctiva="accion valida test", responsable_id=9999),
        )


def test_reabrir_incidente_inexistente(db_session: Session):
    """Verifica que reabrir un incidente inexistente lance IncidenteNoEncontrado."""
    empleado = _crear_empleado(db_session)
    reapertura = schemas.ReaperturaIncidente(motivo="motivo test", responsable_id=empleado.id)

    with pytest.raises(exceptions.IncidenteNoEncontrado):
        services.reabrir_incidente(db_session, 9999, reapertura)


def test_reabrir_incidente_que_sigue_abierto(db_session: Session):
    """Verifica que solo se pueda reabrir un incidente cerrado."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado)

    with pytest.raises(exceptions.IncidenteNoCerrado):
        services.reabrir_incidente(
            db_session,
            creado.id,
            schemas.ReaperturaIncidente(motivo="quiero reabrirlo igual", responsable_id=empleado.id),
        )


def test_reabrir_incidente_sin_motivo(db_session: Session):
    """Verifica que un motivo de reapertura en blanco lance MotivoReaperturaRequerido."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado)
    services.cerrar_incidente(
        db_session,
        creado.id,
        schemas.CierreIncidente(accion_correctiva="se dio por resuelto", responsable_id=empleado.id),
    )

    with pytest.raises(exceptions.MotivoReaperturaRequerido):
        services.reabrir_incidente(
            db_session,
            creado.id,
            schemas.ReaperturaIncidente(motivo="   ", responsable_id=empleado.id),
        )


def test_reabrir_incidente_responsable_inexistente(db_session: Session):
    """Verifica que un responsable de reapertura inexistente lance EmpleadoNoEncontrado."""
    empleado = _crear_empleado(db_session)
    creado = _crear_incidente(db_session, empleado)
    services.cerrar_incidente(
        db_session,
        creado.id,
        schemas.CierreIncidente(accion_correctiva="se dio por resuelto", responsable_id=empleado.id),
    )

    with pytest.raises(empleados_exceptions.EmpleadoNoEncontrado):
        services.reabrir_incidente(
            db_session,
            creado.id,
            schemas.ReaperturaIncidente(motivo="motivo valido test", responsable_id=9999),
        )
