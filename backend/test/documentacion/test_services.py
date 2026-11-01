from datetime import date, timedelta

import pytest
from sqlalchemy.orm import Session

from src.archivos import exceptions as archivos_exceptions
from src.archivos.constants import CARACTERES_MAXIMOS
from src.documentacion import exceptions, models, schemas, services
from src.documentacion.constants import DIAS_AVISO_POR_DEFECTO, TipoDocumentacion
from src.empleados import exceptions as empleados_exceptions
from src.empleados.models import Empleado, RolEmpleado
from src.vencimientos import EstadoVencimiento

ARCHIVO_VALIDO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="
HOY = date.today()


def _crear_empleado(
    db: Session,
    legajo: str = "EMP-9000",
    dni: str = "40000000",
    nombre: str = "empleado",
    apellido: str = "test",
    activo: bool = True,
) -> Empleado:
    """Crea el empleado al que pertenece la documentacion."""
    empleado = Empleado(
        legajo=legajo,
        dni=dni,
        nombre=nombre,
        apellido=apellido,
        activo=activo,
        rol=RolEmpleado.OPERARIO,
    )
    db.add(empleado)
    db.commit()
    db.refresh(empleado)
    return empleado


def _libreta(
    empleado_id: int,
    dias: int = 200,
    numero_carnet: str = "LS-1000",
    autoridad_emisora: str = "Municipio de Trelew",
) -> schemas.LibretaSanitariaCreate:
    """Arma el alta de una libreta sanitaria que vence dentro de tantos dias."""
    return schemas.LibretaSanitariaCreate(
        tipo=TipoDocumentacion.LIBRETA_SANITARIA,
        empleado_id=empleado_id,
        fecha_vencimiento=HOY + timedelta(days=dias),
        numero_carnet=numero_carnet,
        autoridad_emisora=autoridad_emisora,
    )


def _capacitacion(
    empleado_id: int,
    dias: int = 200,
    titulo: str = "Buenas practicas de manufactura",
    observaciones: str | None = None,
) -> schemas.CapacitacionCreate:
    """Arma el alta de una capacitacion que vence dentro de tantos dias."""
    return schemas.CapacitacionCreate(
        tipo=TipoDocumentacion.CAPACITACION,
        empleado_id=empleado_id,
        fecha_vencimiento=HOY + timedelta(days=dias),
        titulo=titulo,
        observaciones=observaciones,
    )


def _certificado(
    empleado_id: int,
    dias: int = 200,
    nombre_medico: str = "Gomez",
    matricula: str = "MP-1234",
) -> schemas.CertificadoAptitudFisicaCreate:
    """Arma el alta de un certificado de aptitud fisica."""
    return schemas.CertificadoAptitudFisicaCreate(
        tipo=TipoDocumentacion.CERTIFICADO_APTITUD_FISICA,
        empleado_id=empleado_id,
        fecha_vencimiento=HOY + timedelta(days=dias),
        nombre_medico=nombre_medico,
        matricula=matricula,
    )


# PRUEBAS POSITIVAS (CASOS DE ÉXITO - SERVICES)

def test_crear_libreta_sanitaria_exito(db_session: Session):
    """Verifica que se cree una libreta sanitaria con sus campos propios."""
    empleado = _crear_empleado(db_session)

    documento = services.crear_documentacion(db_session, _libreta(empleado.id))
    assert documento.id is not None
    assert isinstance(documento, models.LibretaSanitaria)
    assert documento.tipo == TipoDocumentacion.LIBRETA_SANITARIA
    assert documento.numero_carnet == "LS-1000"
    assert documento.autoridad_emisora == "Municipio de Trelew"
    assert documento.empleado_id == empleado.id


def test_crear_capacitacion_exito(db_session: Session):
    """Verifica que se cree una capacitacion con sus campos propios."""
    empleado = _crear_empleado(db_session)

    documento = services.crear_documentacion(
        db_session, _capacitacion(empleado.id, observaciones="dictada en planta")
    )
    assert isinstance(documento, models.Capacitacion)
    assert documento.tipo == TipoDocumentacion.CAPACITACION
    assert documento.titulo == "Buenas practicas de manufactura"
    assert documento.observaciones == "dictada en planta"


def test_crear_certificado_aptitud_fisica_exito(db_session: Session):
    """Verifica que se cree un certificado de aptitud fisica con sus campos propios."""
    empleado = _crear_empleado(db_session)

    documento = services.crear_documentacion(db_session, _certificado(empleado.id))
    assert isinstance(documento, models.CertificadoAptitudFisica)
    assert documento.tipo == TipoDocumentacion.CERTIFICADO_APTITUD_FISICA
    assert documento.nombre_medico == "Gomez"
    assert documento.matricula == "MP-1234"


def test_crear_documentacion_con_archivo_adjunto(db_session: Session):
    """Verifica que se guarde el archivo escaneado del documento."""
    empleado = _crear_empleado(db_session)
    datos = _libreta(empleado.id)
    datos.archivo_url = ARCHIVO_VALIDO
    datos.archivo_nombre = "libreta.png"

    documento = services.crear_documentacion(db_session, datos)
    assert documento.archivo_url == ARCHIVO_VALIDO
    assert documento.archivo_nombre == "libreta.png"


def test_crear_documentacion_sin_archivo(db_session: Session):
    """Verifica que el archivo sea opcional."""
    empleado = _crear_empleado(db_session)

    documento = services.crear_documentacion(db_session, _libreta(empleado.id))
    assert documento.archivo_url is None
    assert documento.archivo_nombre is None


def test_listar_documentacion_vacio_y_con_datos(db_session: Session):
    """Verifica listar documentacion sin datos y con varios documentos."""
    assert services.listar_documentacion(db_session) == []

    empleado = _crear_empleado(db_session)
    services.crear_documentacion(db_session, _libreta(empleado.id))
    services.crear_documentacion(db_session, _capacitacion(empleado.id))

    assert len(services.listar_documentacion(db_session)) == 2


def test_listar_documentacion_ordena_por_fecha_de_vencimiento(db_session: Session):
    """Verifica que el listado priorice lo que vence antes."""
    empleado = _crear_empleado(db_session)
    services.crear_documentacion(db_session, _libreta(empleado.id, dias=300))
    services.crear_documentacion(db_session, _capacitacion(empleado.id, dias=10))
    services.crear_documentacion(db_session, _certificado(empleado.id, dias=100))

    lista = services.listar_documentacion(db_session)
    assert [d.tipo for d in lista] == [
        TipoDocumentacion.CAPACITACION,
        TipoDocumentacion.CERTIFICADO_APTITUD_FISICA,
        TipoDocumentacion.LIBRETA_SANITARIA,
    ]


def test_listar_documentacion_filtra_por_empleado(db_session: Session):
    """Verifica el filtro por empleado del listado."""
    uno = _crear_empleado(db_session, legajo="EMP-9001", dni="40000001")
    otro = _crear_empleado(db_session, legajo="EMP-9002", dni="40000002")
    suyo = services.crear_documentacion(db_session, _libreta(uno.id, numero_carnet="LS-A"))
    services.crear_documentacion(db_session, _libreta(otro.id, numero_carnet="LS-B"))

    lista = services.listar_documentacion(db_session, empleado_id=uno.id)
    assert [d.id for d in lista] == [suyo.id]


def test_listar_documentacion_filtra_por_tipo(db_session: Session):
    """Verifica el filtro por tipo de documento del listado."""
    empleado = _crear_empleado(db_session)
    libreta = services.crear_documentacion(db_session, _libreta(empleado.id))
    services.crear_documentacion(db_session, _capacitacion(empleado.id))

    lista = services.listar_documentacion(
        db_session, tipo=TipoDocumentacion.LIBRETA_SANITARIA
    )
    assert [d.id for d in lista] == [libreta.id]


def test_leer_documentacion_exito(db_session: Session):
    """Verifica leer un documento por ID."""
    empleado = _crear_empleado(db_session)
    creado = services.crear_documentacion(db_session, _libreta(empleado.id))

    leido = services.leer_documentacion(db_session, creado.id)
    assert leido.id == creado.id
    assert leido.numero_carnet == "LS-1000"


def test_modificar_documentacion_fecha_de_vencimiento(db_session: Session):
    """Verifica que se pueda renovar la fecha de vencimiento."""
    empleado = _crear_empleado(db_session)
    creado = services.crear_documentacion(db_session, _libreta(empleado.id, dias=10))
    nueva_fecha = HOY + timedelta(days=400)

    modificado = services.modificar_documentacion(
        db_session, creado.id, schemas.DocumentacionUpdate(fecha_vencimiento=nueva_fecha)
    )
    assert modificado.fecha_vencimiento == nueva_fecha


def test_modificar_documentacion_campos_del_subtipo(db_session: Session):
    """Verifica que se puedan modificar los campos propios del tipo de documento."""
    empleado = _crear_empleado(db_session)
    creado = services.crear_documentacion(db_session, _libreta(empleado.id))

    modificado = services.modificar_documentacion(
        db_session,
        creado.id,
        schemas.DocumentacionUpdate(
            fecha_vencimiento=creado.fecha_vencimiento,
            numero_carnet="LS-2000",
            autoridad_emisora="Municipio de Rawson",
        ),
    )
    assert modificado.numero_carnet == "LS-2000"
    assert modificado.autoridad_emisora == "Municipio de Rawson"


def test_modificar_documentacion_no_pisa_los_campos_no_enviados(db_session: Session):
    """Verifica que modificar solo la fecha no borre los campos propios del documento."""
    empleado = _crear_empleado(db_session)
    creado = services.crear_documentacion(db_session, _libreta(empleado.id))

    modificado = services.modificar_documentacion(
        db_session,
        creado.id,
        schemas.DocumentacionUpdate(fecha_vencimiento=HOY + timedelta(days=500)),
    )
    assert modificado.numero_carnet == "LS-1000"
    assert modificado.autoridad_emisora == "Municipio de Trelew"


def test_eliminar_documentacion_exito(db_session: Session):
    """Verifica que se pueda eliminar un documento."""
    empleado = _crear_empleado(db_session)
    creado = services.crear_documentacion(db_session, _libreta(empleado.id))

    resultado = services.eliminar_documentacion(db_session, creado.id)
    assert resultado["id"] == creado.id
    assert resultado["msg"] == "borrado"

    with pytest.raises(exceptions.DocumentacionNoEncontrada):
        services.leer_documentacion(db_session, creado.id)


def test_listar_requisitos_crea_los_que_faltan(db_session: Session):
    """Verifica que se cree un requisito por cada tipo, no obligatorio y con su aviso por defecto."""
    requisitos = services.listar_requisitos(db_session)

    assert len(requisitos) == len(TipoDocumentacion)
    for requisito in requisitos:
        assert requisito.obligatorio is False
        assert requisito.dias_aviso_previo == DIAS_AVISO_POR_DEFECTO[requisito.tipo]


def test_listar_requisitos_no_duplica_los_existentes(db_session: Session):
    """Verifica que llamar dos veces no genere requisitos repetidos."""
    services.listar_requisitos(db_session)
    requisitos = services.listar_requisitos(db_session)

    assert len(requisitos) == len(TipoDocumentacion)
    assert len({r.tipo for r in requisitos}) == len(TipoDocumentacion)


def test_modificar_requisito_lo_vuelve_obligatorio(db_session: Session):
    """Verifica que se pueda marcar un tipo de documento como obligatorio."""
    modificado = services.modificar_requisito(
        db_session,
        TipoDocumentacion.LIBRETA_SANITARIA,
        schemas.RequisitoUpdate(obligatorio=True),
    )
    assert modificado.obligatorio is True


def test_modificar_requisito_cambia_los_dias_de_aviso(db_session: Session):
    """Verifica que se puedan ajustar los dias de aviso previo de un tipo."""
    modificado = services.modificar_requisito(
        db_session,
        TipoDocumentacion.CAPACITACION,
        schemas.RequisitoUpdate(dias_aviso_previo=60),
    )
    assert modificado.dias_aviso_previo == 60


def test_tipos_obligatorios_devuelve_solo_los_marcados(db_session: Session):
    """Verifica que se listen unicamente los tipos marcados como obligatorios."""
    assert services.tipos_obligatorios(db_session) == []

    services.modificar_requisito(
        db_session,
        TipoDocumentacion.LIBRETA_SANITARIA,
        schemas.RequisitoUpdate(obligatorio=True),
    )
    assert services.tipos_obligatorios(db_session) == [TipoDocumentacion.LIBRETA_SANITARIA]


def test_dias_aviso_previo_toma_el_valor_del_requisito(db_session: Session):
    """Verifica que el aviso configurado en el requisito reemplace al valor por defecto."""
    empleado = _crear_empleado(db_session)
    documento = services.crear_documentacion(db_session, _libreta(empleado.id, dias=100))

    assert documento.dias_aviso_previo == 15
    assert documento.estado == EstadoVencimiento.VIGENTE

    services.listar_requisitos(db_session)
    db_session.refresh(documento)

    assert documento.dias_aviso_previo == DIAS_AVISO_POR_DEFECTO[TipoDocumentacion.LIBRETA_SANITARIA]
    assert documento.estado == EstadoVencimiento.PROXIMO


def test_estado_vencido(db_session: Session):
    """Verifica que un documento con fecha pasada quede vencido."""
    empleado = _crear_empleado(db_session)
    documento = services.crear_documentacion(db_session, _capacitacion(empleado.id, dias=-5))

    assert documento.dias_restantes == -5
    assert documento.estado == EstadoVencimiento.VENCIDO


def test_estado_proximo(db_session: Session):
    """Verifica que un documento dentro del plazo de aviso quede proximo a vencer."""
    empleado = _crear_empleado(db_session)
    documento = services.crear_documentacion(db_session, _capacitacion(empleado.id, dias=10))

    assert documento.estado == EstadoVencimiento.PROXIMO


def test_estado_vigente(db_session: Session):
    """Verifica que un documento lejos de vencer quede vigente."""
    empleado = _crear_empleado(db_session)
    documento = services.crear_documentacion(db_session, _capacitacion(empleado.id, dias=200))

    assert documento.estado == EstadoVencimiento.VIGENTE


def test_estado_el_dia_del_vencimiento_todavia_no_esta_vencido(db_session: Session):
    """Verifica que el mismo dia del vencimiento el documento siga como proximo."""
    empleado = _crear_empleado(db_session)
    documento = services.crear_documentacion(db_session, _capacitacion(empleado.id, dias=0))

    assert documento.dias_restantes == 0
    assert documento.estado == EstadoVencimiento.PROXIMO


def test_estado_el_dia_posterior_al_vencimiento_esta_vencido(db_session: Session):
    """Verifica que al dia siguiente del vencimiento el documento pase a vencido."""
    empleado = _crear_empleado(db_session)
    documento = services.crear_documentacion(db_session, _capacitacion(empleado.id, dias=-1))

    assert documento.estado == EstadoVencimiento.VENCIDO


def test_estado_en_el_ultimo_dia_del_aviso_es_proximo(db_session: Session):
    """Verifica que el limite exacto del plazo de aviso todavia cuente como proximo."""
    empleado = _crear_empleado(db_session)
    documento = services.crear_documentacion(db_session, _capacitacion(empleado.id, dias=15))

    assert documento.dias_aviso_previo == 15
    assert documento.estado == EstadoVencimiento.PROXIMO


def test_estado_un_dia_antes_de_entrar_al_aviso_es_vigente(db_session: Session):
    """Verifica que un dia fuera del plazo de aviso el documento siga vigente."""
    empleado = _crear_empleado(db_session)
    documento = services.crear_documentacion(db_session, _capacitacion(empleado.id, dias=16))

    assert documento.dias_aviso_previo == 15
    assert documento.estado == EstadoVencimiento.VIGENTE


def test_obtener_alertas_ordena_vencidos_primero(db_session: Session):
    """Verifica que las alertas prioricen vencidos, luego proximos y por ultimo vigentes."""
    empleado = _crear_empleado(db_session)
    services.crear_documentacion(db_session, _libreta(empleado.id, dias=300))
    services.crear_documentacion(db_session, _capacitacion(empleado.id, dias=5))
    services.crear_documentacion(db_session, _certificado(empleado.id, dias=-20))

    alertas = services.obtener_alertas(db_session)
    assert [a.estado for a in alertas] == [
        EstadoVencimiento.VENCIDO,
        EstadoVencimiento.PROXIMO,
        EstadoVencimiento.VIGENTE,
    ]


def test_obtener_alertas_prioriza_el_estado_por_sobre_la_fecha(db_session: Session):
    """Verifica que el orden lo determine el estado y no la fecha de vencimiento."""
    empleado = _crear_empleado(db_session)
    services.listar_requisitos(db_session)

    services.crear_documentacion(db_session, _capacitacion(empleado.id, dias=50))
    services.crear_documentacion(db_session, _libreta(empleado.id, dias=100))

    alertas = services.obtener_alertas(db_session)
    assert [a.estado for a in alertas] == [
        EstadoVencimiento.PROXIMO,
        EstadoVencimiento.VIGENTE,
    ]
    assert [a.tipo for a in alertas] == [
        TipoDocumentacion.LIBRETA_SANITARIA,
        TipoDocumentacion.CAPACITACION,
    ]


def test_obtener_alertas_describe_cada_tipo(db_session: Session):
    """Verifica que la descripcion de la alerta identifique el documento."""
    empleado = _crear_empleado(db_session)
    services.crear_documentacion(db_session, _libreta(empleado.id, numero_carnet="LS-777"))
    services.crear_documentacion(db_session, _capacitacion(empleado.id, titulo="Manipulacion"))
    services.crear_documentacion(db_session, _certificado(empleado.id, nombre_medico="Perez"))

    descripciones = {a.tipo: a.descripcion for a in services.obtener_alertas(db_session)}
    assert descripciones[TipoDocumentacion.LIBRETA_SANITARIA] == "Libreta sanitaria N° LS-777"
    assert descripciones[TipoDocumentacion.CAPACITACION] == "Capacitación: Manipulacion"
    assert descripciones[TipoDocumentacion.CERTIFICADO_APTITUD_FISICA] == "Apto físico (Dr/a. Perez)"


def test_obtener_alertas_filtra_por_tipo(db_session: Session):
    """Verifica el filtro por tipo de las alertas."""
    empleado = _crear_empleado(db_session)
    services.crear_documentacion(db_session, _libreta(empleado.id))
    services.crear_documentacion(db_session, _capacitacion(empleado.id))

    alertas = services.obtener_alertas(db_session, tipo=TipoDocumentacion.CAPACITACION)
    assert len(alertas) == 1
    assert alertas[0].tipo == TipoDocumentacion.CAPACITACION


def test_obtener_alertas_filtra_por_empleado(db_session: Session):
    """Verifica el filtro por empleado de las alertas."""
    uno = _crear_empleado(db_session, legajo="EMP-9001", dni="40000001")
    otro = _crear_empleado(db_session, legajo="EMP-9002", dni="40000002")
    services.crear_documentacion(db_session, _libreta(uno.id, numero_carnet="LS-A"))
    services.crear_documentacion(db_session, _libreta(otro.id, numero_carnet="LS-B"))

    alertas = services.obtener_alertas(db_session, empleado_id=uno.id)
    assert len(alertas) == 1
    assert alertas[0].empleado.id == uno.id


def test_obtener_alertas_filtra_por_rango_de_fechas(db_session: Session):
    """Verifica que el rango desde/hasta acote las alertas devueltas."""
    empleado = _crear_empleado(db_session)
    services.crear_documentacion(db_session, _capacitacion(empleado.id, dias=5))
    services.crear_documentacion(db_session, _certificado(empleado.id, dias=50))
    services.crear_documentacion(db_session, _libreta(empleado.id, dias=300))

    alertas = services.obtener_alertas(
        db_session,
        fecha_desde=HOY + timedelta(days=10),
        fecha_hasta=HOY + timedelta(days=100),
    )
    assert len(alertas) == 1
    assert alertas[0].tipo == TipoDocumentacion.CERTIFICADO_APTITUD_FISICA


def test_obtener_cumplimiento_completo(db_session: Session):
    """Verifica que un empleado con la documentacion obligatoria al dia figure completo."""
    empleado = _crear_empleado(db_session)
    services.modificar_requisito(
        db_session,
        TipoDocumentacion.LIBRETA_SANITARIA,
        schemas.RequisitoUpdate(obligatorio=True),
    )
    services.crear_documentacion(db_session, _libreta(empleado.id, dias=300))

    cumplimiento = services.obtener_cumplimiento(db_session, empleado.id)
    assert cumplimiento.completo is True
    assert cumplimiento.faltantes == []
    assert cumplimiento.vencidos == []


def test_obtener_cumplimiento_con_documento_faltante(db_session: Session):
    """Verifica que se informe el tipo obligatorio que el empleado no presento."""
    empleado = _crear_empleado(db_session)
    services.modificar_requisito(
        db_session,
        TipoDocumentacion.LIBRETA_SANITARIA,
        schemas.RequisitoUpdate(obligatorio=True),
    )

    cumplimiento = services.obtener_cumplimiento(db_session, empleado.id)
    assert cumplimiento.completo is False
    assert cumplimiento.faltantes == [TipoDocumentacion.LIBRETA_SANITARIA]


def test_obtener_cumplimiento_con_documento_vencido(db_session: Session):
    """Verifica que un obligatorio vencido deje el cumplimiento incompleto."""
    empleado = _crear_empleado(db_session)
    services.modificar_requisito(
        db_session,
        TipoDocumentacion.CAPACITACION,
        schemas.RequisitoUpdate(obligatorio=True),
    )
    services.crear_documentacion(db_session, _capacitacion(empleado.id, dias=-3))

    cumplimiento = services.obtener_cumplimiento(db_session, empleado.id)
    assert cumplimiento.completo is False
    assert cumplimiento.faltantes == []
    assert cumplimiento.vencidos == [TipoDocumentacion.CAPACITACION]


def test_obtener_cumplimiento_sin_obligatorios_siempre_completo(db_session: Session):
    """Verifica que sin tipos obligatorios todo empleado figure en regla."""
    empleado = _crear_empleado(db_session)

    cumplimiento = services.obtener_cumplimiento(db_session, empleado.id)
    assert cumplimiento.completo is True


def test_listar_cumplimiento_de_todo_el_personal(db_session: Session):
    """Verifica que el listado cubra a todos los empleados activos."""
    _crear_empleado(db_session, legajo="EMP-9001", dni="40000001")
    _crear_empleado(db_session, legajo="EMP-9002", dni="40000002")

    assert len(services.listar_cumplimiento(db_session)) == 2


def test_listar_cumplimiento_solo_incompletos(db_session: Session):
    """Verifica que el filtro deje solo al personal con documentacion pendiente."""
    en_regla = _crear_empleado(db_session, legajo="EMP-9001", dni="40000001")
    sin_libreta = _crear_empleado(db_session, legajo="EMP-9002", dni="40000002")
    services.modificar_requisito(
        db_session,
        TipoDocumentacion.LIBRETA_SANITARIA,
        schemas.RequisitoUpdate(obligatorio=True),
    )
    services.crear_documentacion(db_session, _libreta(en_regla.id, dias=300))

    incompletos = services.listar_cumplimiento(db_session, solo_incompletos=True)
    assert len(incompletos) == 1
    assert incompletos[0].empleado.id == sin_libreta.id


def test_listar_cumplimiento_ignora_empleados_inactivos(db_session: Session):
    """Verifica que el personal dado de baja no figure en el control documental."""
    _crear_empleado(db_session, legajo="EMP-9001", dni="40000001")
    _crear_empleado(db_session, legajo="EMP-9002", dni="40000002", activo=False)

    cumplimiento = services.listar_cumplimiento(db_session)
    assert len(cumplimiento) == 1
    assert cumplimiento[0].empleado.legajo == "EMP-9001"


# PRUEBAS NEGATIVAS (CASOS DE FALLA - SERVICES)

def test_crear_documentacion_empleado_inexistente(db_session: Session):
    """Verifica que cargar documentacion de un empleado inexistente lance EmpleadoNoEncontrado."""
    with pytest.raises(empleados_exceptions.EmpleadoNoEncontrado):
        services.crear_documentacion(db_session, _libreta(9999))


def test_crear_documentacion_archivo_formato_invalido(db_session: Session):
    """Verifica que un adjunto que no sea imagen ni PDF lance ArchivoFormatoInvalido."""
    empleado = _crear_empleado(db_session)
    datos = _libreta(empleado.id)
    datos.archivo_url = "data:text/plain;base64,aG9sYQ=="

    with pytest.raises(archivos_exceptions.ArchivoFormatoInvalido):
        services.crear_documentacion(db_session, datos)


def test_crear_documentacion_archivo_demasiado_grande(db_session: Session):
    """Verifica que un adjunto que supere el tamanio permitido lance ArchivoDemasiadoGrande."""
    empleado = _crear_empleado(db_session)
    datos = _libreta(empleado.id)
    datos.archivo_url = "data:image/png;base64," + "A" * CARACTERES_MAXIMOS

    with pytest.raises(archivos_exceptions.ArchivoDemasiadoGrande):
        services.crear_documentacion(db_session, datos)


def test_crear_libreta_con_numero_de_carnet_duplicado(db_session: Session):
    """Verifica que no se repita el numero de carnet entre libretas sanitarias."""
    empleado = _crear_empleado(db_session)
    services.crear_documentacion(db_session, _libreta(empleado.id, numero_carnet="LS-UNICO"))

    with pytest.raises(exceptions.NumeroCarnetDuplicado):
        services.crear_documentacion(
            db_session, _libreta(empleado.id, dias=100, numero_carnet="LS-UNICO")
        )


def test_leer_documentacion_inexistente(db_session: Session):
    """Verifica que leer un documento por ID inexistente lance DocumentacionNoEncontrada."""
    with pytest.raises(exceptions.DocumentacionNoEncontrada):
        services.leer_documentacion(db_session, 9999)


def test_modificar_documentacion_inexistente(db_session: Session):
    """Verifica que modificar un documento inexistente lance DocumentacionNoEncontrada."""
    with pytest.raises(exceptions.DocumentacionNoEncontrada):
        services.modificar_documentacion(
            db_session, 9999, schemas.DocumentacionUpdate(fecha_vencimiento=HOY)
        )


def test_modificar_documentacion_archivo_invalido(db_session: Session):
    """Verifica que adjuntar un archivo invalido al modificar lance ArchivoFormatoInvalido."""
    empleado = _crear_empleado(db_session)
    creado = services.crear_documentacion(db_session, _libreta(empleado.id))

    with pytest.raises(archivos_exceptions.ArchivoFormatoInvalido):
        services.modificar_documentacion(
            db_session,
            creado.id,
            schemas.DocumentacionUpdate(
                fecha_vencimiento=creado.fecha_vencimiento,
                archivo_url="data:text/plain;base64,aG9sYQ==",
            ),
        )


def test_modificar_libreta_a_un_carnet_ya_usado(db_session: Session):
    """Verifica que no se pueda reusar el numero de carnet de otra libreta."""
    empleado = _crear_empleado(db_session)
    services.crear_documentacion(db_session, _libreta(empleado.id, numero_carnet="LS-A"))
    otra = services.crear_documentacion(
        db_session, _libreta(empleado.id, dias=100, numero_carnet="LS-B")
    )

    with pytest.raises(exceptions.NumeroCarnetDuplicado):
        services.modificar_documentacion(
            db_session,
            otra.id,
            schemas.DocumentacionUpdate(
                fecha_vencimiento=otra.fecha_vencimiento, numero_carnet="LS-A"
            ),
        )


def test_eliminar_documentacion_inexistente(db_session: Session):
    """Verifica que eliminar un documento inexistente lance DocumentacionNoEncontrada."""
    with pytest.raises(exceptions.DocumentacionNoEncontrada):
        services.eliminar_documentacion(db_session, 9999)


def test_obtener_cumplimiento_de_empleado_inexistente(db_session: Session):
    """Verifica que pedir el cumplimiento de un empleado inexistente lance EmpleadoNoEncontrado."""
    with pytest.raises(empleados_exceptions.EmpleadoNoEncontrado):
        services.obtener_cumplimiento(db_session, 9999)
