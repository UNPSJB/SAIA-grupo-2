import random
from datetime import date, datetime, time, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import insert, delete

from src.database import SessionLocal, engine
from src.models import Base
from src.capacidades.models import Capacidad
from src.empleados.models import Empleado, RolEmpleado
from src.equipos.models import Equipo, TipoEquipo
from src.calibracion_realizada.models import CalibracionRealizada
from src.insumos.models import Insumo
from src.unidades_medida.models import UnidadMedida
from src.sectores.models import Sector

from src.productos_limpieza.models import ProductoLimpieza
from src.productos_limpieza.constants import TipoProductoLimpieza
from src.tareas.models import Tarea, ConsumoEstimado
from src.tareas.constants import FrecuenciaTarea
from src.elementos_limpieza.models import ElementoLimpieza
from src.documentacion.constants import TipoDocumentacion
from src.documentacion.models import (
    Documentacion,
    LibretaSanitaria,
    Capacitacion,
    CertificadoAptitudFisica,
    RequisitoDocumentacion,
)
from src.planes.models import Plan
from src.checklists.models import Checklist, ConsumoReal
from src.incidentes.models import Incidente, MovimientoIncidente
from src.incidentes.constants import EstadoIncidente, TipoIncidente, TipoMovimiento

from src.documentos_versionados.models import DocumentoVersionado
from src.documentos_versionados.constants import TipoDocumentoVersionado
from src.asociaciones.version_documento import version_documento, EstadoVersionDocumento
from src.productos.models import Producto
from src.productos.constants import TipoProducto
from src.lotes_produccion.models import LoteProduccion
from src.lotes_produccion import services as lotes_produccion_services
from src.asociaciones.lote_insumos import lote_insumo
from pathlib import Path
from src.unidades_medida import services as unidades_medida_services
from src.alimentos_referencia.models import AlimentoReferencia
from src.alimentos_referencia import services as alimentos_referencia_services
from src.datos_nutricionales import services as datos_nutricionales_services
from src.datos_nutricionales.constants import FuenteDatoNutricional, Nutriente
from src.datos_nutricionales.schemas import CargaDatosNutricionales

DIAS_DE_HISTORIAL = 90
ZONA_PLANTA = timezone(timedelta(hours=-3))

DATOS_TAREAS = [
    ("Desinfección de Superficies", FrecuenciaTarea.DIARIA, [("Hipoclorito 10%", 0.5), ("Paños de Microfibra", 1.0)]),
    ("Limpieza Profunda de Equipos", FrecuenciaTarea.SEMANAL, [("Detergente Enzimático", 1.5)]),
    ("Limpieza General de Sector", FrecuenciaTarea.DIARIA, [("Hipoclorito 10%", 2.0)]),
    ("Limpieza de Cámaras y Estanterías", FrecuenciaTarea.DIARIA, [("Detergente Enzimático", 0.8), ("Hipoclorito 10%", 0.5)]),
    ("Sanitización de Utensilios", FrecuenciaTarea.DIARIA, [("Jabón Bactericida", 0.4), ("Alcohol Etílico 70%", 0.2)]),
    ("Desengrase de Hornos y Campanas", FrecuenciaTarea.DIARIA, [("Desengrasante Alcalino", 1.0), ("Paños de Microfibra", 2.0)]),
    ("Lavado de Pisos y Desagües", FrecuenciaTarea.DIARIA, [("Detergente Enzimático", 1.0), ("Hipoclorito 10%", 1.0)]),
    ("Limpieza de Cinta Transportadora", FrecuenciaTarea.DIARIA, [("Detergente Enzimático", 0.6), ("Alcohol Etílico 70%", 0.3)]),
    ("Desinfección de Mesadas de Trabajo", FrecuenciaTarea.DIARIA, [("Alcohol Etílico 70%", 0.3), ("Paños de Microfibra", 1.0)]),
    ("Limpieza de Balanzas e Instrumental", FrecuenciaTarea.DIARIA, [("Alcohol Etílico 70%", 0.1), ("Paños de Microfibra", 1.0)]),
    ("Retiro de Residuos y Lavado de Contenedores", FrecuenciaTarea.DIARIA, [("Hipoclorito 10%", 0.8), ("Jabón Bactericida", 0.3)]),
]

DATOS_PLANES = [
    (
        "Saneamiento Diario - Depósito Frío", "Depósito Frío", DIAS_DE_HISTORIAL,
        ["Heladera Cámara 1", "Cámara de Congelados"],
        ["Desinfección de Superficies", "Limpieza de Cámaras y Estanterías"],
    ),
    (
        "Mantenimiento Semanal - Cocción", "Sector Cocción", DIAS_DE_HISTORIAL,
        ["Horno Rotativo", "Termómetro de Pinche"],
        ["Limpieza Profunda de Equipos", "Desinfección de Superficies", "Desengrase de Hornos y Campanas"],
    ),
    (
        "POES - Recepción de Materia Prima", "Recepción de Materia Prima", DIAS_DE_HISTORIAL,
        ["Balanza Digital 30kg"],
        ["Lavado de Pisos y Desagües", "Limpieza de Balanzas e Instrumental"],
    ),
    (
        "POES - Sector Preparación", "Sector Preparación", DIAS_DE_HISTORIAL,
        ["Amasadora Industrial 50kg", "Mezcladora de Polvos 100L"],
        ["Desinfección de Mesadas de Trabajo", "Sanitización de Utensilios"],
    ),
    (
        "POES - Control de Calidad", "Control de Calidad", DIAS_DE_HISTORIAL,
        ["Termómetro Infrarrojo"],
        ["Desinfección de Superficies"],
    ),
    (
        "POES - Mantenimiento", "Mantenimiento", DIAS_DE_HISTORIAL,
        [],
        ["Limpieza General de Sector", "Retiro de Residuos y Lavado de Contenedores"],
    ),
    (
        "POES - Sector Empaque", "Sector Empaque", DIAS_DE_HISTORIAL,
        ["Envasadora al Vacío", "Detector de Metales Fin de Línea"],
        ["Limpieza General de Sector", "Desinfección de Mesadas de Trabajo"],
    ),
    (
        "POES - Laboratorio de Calidad", "Laboratorio de Calidad", 40,
        ["Balanza de Precisión"],
        ["Limpieza de Balanzas e Instrumental", "Sanitización de Utensilios"],
    ),
    (
        "POES - Línea de Producción", "Línea de Producción", DIAS_DE_HISTORIAL,
        ["Cinta Transportadora Ppal"],
        ["Limpieza de Cinta Transportadora", "Lavado de Pisos y Desagües", "Retiro de Residuos y Lavado de Contenedores"],
    ),
]

CUMPLIMIENTO_POR_SECTOR = {
    "Depósito Frío": 0.96,
    "Sector Cocción": 0.90,
    "Recepción de Materia Prima": 0.82,
    "Sector Preparación": 0.93,
    "Control de Calidad": 0.97,
    "Mantenimiento": 0.62,
    "Sector Empaque": 0.86,
    "Laboratorio de Calidad": 0.91,
    "Línea de Producción": 0.74,
}

AJUSTE_POR_TAREA = {
    "Retiro de Residuos y Lavado de Contenedores": -0.08,
    "Lavado de Pisos y Desagües": -0.05,
    "Desengrase de Hornos y Campanas": -0.06,
}

AJUSTE_POR_DIA_SEMANA = {5: -0.08, 6: -0.22}

HORA_HABITUAL_POR_TAREA = {
    "Limpieza de Balanzas e Instrumental": (7, 30),
    "Limpieza de Cámaras y Estanterías": (8, 15),
    "Desinfección de Mesadas de Trabajo": (9, 0),
    "Desinfección de Superficies": (10, 15),
    "Limpieza de Cinta Transportadora": (12, 30),
    "Sanitización de Utensilios": (14, 0),
    "Desengrase de Hornos y Campanas": (15, 45),
    "Limpieza Profunda de Equipos": (16, 30),
    "Limpieza General de Sector": (17, 0),
    "Lavado de Pisos y Desagües": (18, 0),
    "Retiro de Residuos y Lavado de Contenedores": (18, 45),
}

DIA_LIMPIEZA_PROFUNDA = 4

OBSERVACIONES_POSIBLES = [
    "Sin novedades.",
    "Se repuso producto en el dosificador.",
    "Se encontró suciedad acumulada en zócalos; se reforzó la limpieza.",
    "Se dejó registro fotográfico en la carpeta del sector.",
    "Faltaban paños limpios; se usaron del depósito general.",
    "Se aplicó doble enjuague por restos de grasa.",
    "Producto diluido según ficha técnica.",
]

DATOS_ELEMENTOS = [
    ("Cepillo de cerdas duras", 90, 100),
    ("Trapo de piso", 30, 35),
    ("Esponja abrasiva", 60, 56),
    ("Guantes de nitrilo", 45, 10),
    ("Balde de 10 litros", None, 0),
    ("Escurridor de goma", 60, 58),
    ("Paños de microfibra (juego)", 15, 20),
    ("Cepillo para desagües", 120, 30),
    ("Escobillón industrial", 90, 84),
]

DATOS_LIBRETAS = [
    ("EMP-1000", 365),
    ("EMP-1001", 310),
    ("EMP-1002", -12),
    ("EMP-1003", 120),
    ("EMP-1004", -60),
    ("EMP-1005", 280),
    ("EMP-1006", 40),
    ("EMP-1007", 220),
]

DATOS_CAPACITACIONES = [
    ("EMP-1002", "Manipulación Segura de Alimentos", 180, None),
    ("EMP-1003", "Manipulación Segura de Alimentos", -5, "Debe rendir el recupero"),
    ("EMP-1005", "Manipulación Segura de Alimentos", 12, None),
    ("EMP-1006", "Buenas Prácticas de Manufactura (BPM)", 25, None),
    ("EMP-1007", "Buenas Prácticas de Manufactura (BPM)", 240, "Aprobada con 9"),
    ("EMP-1001", "Uso Seguro de Productos Químicos", 300, None),
    ("EMP-1002", "Uso Seguro de Productos Químicos", 45, None),
    ("EMP-1000", "Sistema HACCP - Nivel 1", 90, None),
]

DATOS_CERTIFICADOS = [
    ("EMP-1002", "Dra. Laura Benítez", "MP-4521", 150),
    ("EMP-1003", "Dr. Martín Aguirre", "MP-3310", 18),
    ("EMP-1005", "Dra. Laura Benítez", "MP-4521", -3),
    ("EMP-1006", "Dr. Martín Aguirre", "MP-3310", 200),
    ("EMP-1007", "Dra. Carla Ruiz", "MP-5102", 330),
]

INCIDENTES_SEED = [
    {"descripcion": "Termómetro de la cámara 1 marcando valores inconsistentes", "tipo": TipoIncidente.ROTURA, "dias": 1, "hora": (9, 20), "reporta": "EMP-1002"},
    {"descripcion": "Se encontró agua acumulada en el piso del sector de lavado", "tipo": TipoIncidente.OTRO, "dias": 2, "hora": (16, 5), "reporta": "EMP-1006"},
    {"descripcion": "Rejilla de desagüe de Línea de Producción suelta", "tipo": TipoIncidente.ROTURA, "dias": 3, "hora": (11, 40), "reporta": "EMP-1006"},
    {"descripcion": "Cliente devolvió un lote por envase mal sellado", "tipo": TipoIncidente.DEVOLUCION_CLIENTE, "dias": 6, "hora": (10, 10), "reporta": "EMP-1007"},
    {
        "descripcion": "Guante de nitrilo roto encontrado cerca de la mezcladora",
        "tipo": TipoIncidente.OTRO, "dias": 5, "hora": (13, 25), "reporta": "EMP-1006",
        "cierre": (0, 3, "Se revisó el lote en proceso y se descartó contaminación. Se recordó el recambio de guantes cada 2 horas.", "EMP-1001"),
    },
    {
        "descripcion": "Burlete de la puerta de la envasadora despegado",
        "tipo": TipoIncidente.ROTURA, "dias": 8, "hora": (8, 50), "reporta": "EMP-1003",
        "cierre": (1, 2, "Se pegó un burlete nuevo y se verificó el sellado con prueba de vacío.", "EMP-1000"),
    },
    {
        "descripcion": "Excremento de roedor detrás de las estanterías del depósito seco",
        "tipo": TipoIncidente.PLAGA, "dias": 9, "hora": (7, 45), "reporta": "EMP-1005",
        "cierre": (1, 6, "Intervino la empresa de control de plagas; se sellaron dos aberturas y se agregaron cebaderas.", "EMP-1000"),
    },
    {"descripcion": "Presencia de plagas en materia prima", "tipo": TipoIncidente.PLAGA, "dias": 11, "hora": (10, 30), "reporta": "EMP-1005"},
    {
        "descripcion": "Corte de cadena de frío durante la descarga de un proveedor",
        "tipo": TipoIncidente.OTRO, "dias": 13, "hora": (6, 55), "reporta": "EMP-1005",
        "cierre": (0, 5, "Se rechazó la mercadería y se notificó al proveedor con registro de temperaturas.", "EMP-1001"),
    },
    {
        "descripcion": "Cinta transportadora frenándose de forma intermitente",
        "tipo": TipoIncidente.ROTURA, "dias": 15, "hora": (12, 15), "reporta": "EMP-1002",
        "cierre": (2, 3, "Se cambió el rodillo tensor y se lubricó el sistema con grasa grado alimenticio.", "EMP-1000"),
    },
    {"descripcion": "Se rompió el burlete de la puerta de la cámara 2", "tipo": TipoIncidente.ROTURA, "dias": 18, "hora": (15, 10), "reporta": "EMP-1000"},
    {
        "descripcion": "Reclamo de cliente por sabor ácido en producto terminado",
        "tipo": TipoIncidente.DEVOLUCION_CLIENTE, "dias": 20, "hora": (11, 0), "reporta": "EMP-1001",
        "cierre": (3, 4, "Se analizó la contramuestra en laboratorio; el lote estaba dentro de parámetros. Se respondió al cliente.", "EMP-1001"),
    },
    {
        "descripcion": "Luminaria del sector de envasado sin protección plástica",
        "tipo": TipoIncidente.OTRO, "dias": 25, "hora": (9, 35), "reporta": "EMP-1001",
        "cierre": (3, 2, "Se colocó tubo protector y se agregó la revisión al checklist mensual.", "EMP-1000"),
    },
    {
        "descripcion": "Moscas en la zona de recepción de materia prima",
        "tipo": TipoIncidente.PLAGA, "dias": 27, "hora": (14, 30), "reporta": "EMP-1005",
        "cierre": (1, 1, "Se instalaron cortinas de aire y trampas de luz UV.", "EMP-1000"),
        "reapertura": (6, 3, "Volvieron a aparecer moscas: la cortina de aire no funciona con la puerta lateral abierta.", "EMP-1005"),
        "segundo_cierre": (2, 2, "Se instaló un cierre automático en la puerta lateral y se reubicaron las trampas.", "EMP-1000"),
    },
    {
        "descripcion": "Balanza de recepción descalibrada (diferencia de 300 g)",
        "tipo": TipoIncidente.ROTURA, "dias": 31, "hora": (8, 5), "reporta": "EMP-1005",
        "cierre": (1, 4, "Se recalibró con pesas patrón y se dejó constancia en la ficha del equipo.", "EMP-1001"),
    },
    {
        "descripcion": "Etiquetas con fecha de vencimiento mal impresa en un lote",
        "tipo": TipoIncidente.OTRO, "dias": 34, "hora": (16, 40), "reporta": "EMP-1007",
        "cierre": (0, 4, "Se reetiquetó el lote completo y se ajustó la plantilla de la etiquetadora.", "EMP-1001"),
    },
    {
        "descripcion": "Supermercado devolvió cajas aplastadas por mala estiba",
        "tipo": TipoIncidente.DEVOLUCION_CLIENTE, "dias": 38, "hora": (10, 50), "reporta": "EMP-1007",
        "cierre": (2, 5, "Se cambió el patrón de estiba y se limitaron a 6 las cajas por columna.", "EMP-1000"),
    },
]

PDF_SIMULADO = "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iag=="

def instante_en_utc(dias_atras: int, hora: int, minuto: int) -> datetime:
    ahora = datetime.now(timezone.utc)
    dia_local = ahora.astimezone(ZONA_PLANTA).date() - timedelta(days=dias_atras)
    instante = datetime.combine(dia_local, time(hora, minuto), tzinfo=ZONA_PLANTA).astimezone(timezone.utc)
    if instante > ahora:
        instante = ahora - timedelta(minutes=40)
    return instante

def generar_historial_checklists(db: Session) -> list:
    azar = random.Random(2026)
    hoy = date.today()
    ahora_local = datetime.now()
    planes = db.query(Plan).all()

    checklists = []
    # Generar ejecuciones para el historial (dias pasados + dia de hoy parcialmente completadas)
    for dias_atras in range(DIAS_DE_HISTORIAL, -1, -1):
        fecha = hoy - timedelta(days=dias_atras)
        mejora = 0.06 * (1 - dias_atras / DIAS_DE_HISTORIAL) - 0.03
        ajuste_dia = AJUSTE_POR_DIA_SEMANA.get(fecha.weekday(), 0.0)

        for plan in planes:
            if plan.fecha_inicio > fecha:
                continue
            sector = plan.sector
            personal = [e for e in sector.empleados if e.activo]
            operarios = [e for e in personal if e.rol == RolEmpleado.OPERARIO] or personal

            for tarea in plan.tareas:
                if tarea.frecuencia == FrecuenciaTarea.SEMANAL:
                    if fecha.weekday() != DIA_LIMPIEZA_PROFUNDA:
                        continue
                    probabilidad = 0.65
                else:
                    probabilidad = (
                        CUMPLIMIENTO_POR_SECTOR.get(sector.nombre, 0.85)
                        + AJUSTE_POR_TAREA.get(tarea.titulo, 0.0)
                        + ajuste_dia
                        + mejora
                    )

                # Si es HOY, forzar que algunas tareas queden completadas y otras pendientes
                if dias_atras == 0:
                    if azar.random() > 0.45: # 45% completadas hoy, 55% pendientes hoy
                        continue

                elif azar.random() > probabilidad:
                    continue

                hora, minuto = HORA_HABITUAL_POR_TAREA.get(tarea.titulo, (11, 0))
                completada = datetime.combine(fecha, time(hora, minuto)) + timedelta(minutes=azar.randint(-35, 50))
                if completada > ahora_local:
                    continue

                responsable = azar.choice(personal) if azar.random() < 0.15 else azar.choice(operarios)
                observaciones = azar.choice(OBSERVACIONES_POSIBLES) if azar.random() < 0.35 else None

                checklist = Checklist(
                    tarea_id=tarea.id,
                    plan_id=plan.id,
                    fecha_programada=fecha,
                    realizada=True,
                    fecha_hora_completada=completada,
                    empleado_id=responsable.id,
                    evidencia_url=PDF_SIMULADO if azar.random() < 0.2 else None,
                    observaciones=observaciones,
                )
                checklist.consumos_reales = [
                    ConsumoReal(
                        producto_limpieza_id=consumo.producto_limpieza_id,
                        cantidad=round(consumo.cantidad * azar.uniform(0.8, 1.3), 2),
                    )
                    for consumo in tarea.consumos_estimados
                ]
                checklists.append(checklist)

    return checklists

def generar_incidentes(db: Session) -> tuple[int, int]:
    empleados = {e.legajo: e for e in db.query(Empleado).all()}
    movimientos = 0

    for datos in INCIDENTES_SEED:
        reportado = instante_en_utc(datos["dias"], *datos["hora"])
        incidente = Incidente(
            descripcion=datos["descripcion"],
            tipo=datos["tipo"],
            estado=EstadoIncidente.ABIERTO,
            empleado_id=empleados[datos["reporta"]].id,
            fecha_hora_reporte=reportado,
        )
        db.add(incidente)
        db.flush()

        momento = reportado
        for clave, tipo in (
            ("cierre", TipoMovimiento.CIERRE),
            ("reapertura", TipoMovimiento.REAPERTURA),
            ("segundo_cierre", TipoMovimiento.CIERRE),
        ):
            if clave not in datos:
                break
            dias_despues, horas_despues, descripcion, legajo = datos[clave]
            momento = momento + timedelta(days=dias_despues, hours=horas_despues)
            responsable = empleados[legajo]
            db.add(
                MovimientoIncidente(
                    incidente_id=incidente.id,
                    tipo=tipo,
                    descripcion=descripcion,
                    empleado_id=responsable.id,
                    fecha_hora=momento,
                )
            )
            movimientos += 1

            if tipo == TipoMovimiento.CIERRE:
                incidente.estado = EstadoIncidente.CERRADO
                incidente.accion_correctiva = descripcion
                incidente.fecha_cierre = momento
                incidente.responsable_cierre_id = responsable.id
            else:
                incidente.estado = EstadoIncidente.ABIERTO
                incidente.accion_correctiva = None
                incidente.fecha_cierre = None
                incidente.responsable_cierre_id = None

    db.commit()
    return len(INCIDENTES_SEED), movimientos

DIAS_DE_PRODUCCION = 45
TODOS_LOS_DIAS_HABILES = (0, 1, 2, 3, 4, 5)

DATOS_PRODUCTOS = [
    ("Pan francés", TipoProducto.ALIMENTO, "Kilogramos", 35, TODOS_LOS_DIAS_HABILES, (40, 70)),
    ("Medialunas de manteca", TipoProducto.ALIMENTO, "Unidades", 0, TODOS_LOS_DIAS_HABILES, (120, 200)),
    ("Pan lactal", TipoProducto.ALIMENTO, "Unidades", 24, (0, 2, 4), (30, 50)),
    ("Prepizza", TipoProducto.ALIMENTO, "Unidades", 60, (1, 3, 5), (80, 120)),
    ("Galletitas de agua", TipoProducto.ALIMENTO, "Unidades", 45, (2,), (40, 60)),
    ("Jugo de naranja exprimido", TipoProducto.BEBIDA, "Litros", 12, (5,), (20, 30)),
]


CONSUMO_POR_UNIDAD_PRODUCIDA = {
    "Pan francés": {"Harina 000": 650, "Levadura Fresca": 15, "Sal Fina": 12},
    "Medialunas de manteca": {
        "Harina 000": 30, "Manteca": 10, "Azúcar Blanca": 6, "Leche Entera": 8, "Levadura Fresca": 1.5, "Sal Fina": 0.5,
    },
    "Pan lactal": {
        "Harina 000": 300, "Leche Entera": 100, "Manteca": 20, "Azúcar Blanca": 15, "Levadura Fresca": 8, "Sal Fina": 6,
    },
    "Prepizza": {"Harina 000": 160, "Aceite de Girasol": 10, "Levadura Fresca": 4, "Sal Fina": 3},
    "Galletitas de agua": {"Harina 000": 110, "Aceite de Girasol": 12, "Sal Fina": 2, "Levadura Fresca": 1},
    "Jugo de naranja exprimido": {"Naranjas": 2000},
}
VARIACION_CONSUMO = 0.05
PROPORCION_CERRADOS_A_MANO = 0.7


def consumos_del_lote(nombre_producto: str, cantidad: float, insumos: dict, azar: random.Random) -> list:
    """Arma el consumo de insumos de un lote (en gramos o mililitros) segun una receta aproximada del producto."""
    filas = []
    for nombre_insumo, por_unidad in CONSUMO_POR_UNIDAD_PRODUCIDA.get(nombre_producto, {}).items():
        insumo, unidad_base_id = insumos[nombre_insumo]
        variacion = azar.uniform(1 - VARIACION_CONSUMO, 1 + VARIACION_CONSUMO)
        filas.append({
            "insumo_id": insumo.id,
            "cantidad_utilizada": round(por_unidad * cantidad * variacion),
            "unidad_medida_id": unidad_base_id,
        })
    return filas


def generar_productos_y_lotes(db: Session) -> int:
    """Crea los productos elaborados y sus lotes de las ultimas semanas, con los insumos consumidos en cada uno.

    El stock de los insumos no se toca: el que se carga en el seed es el que quedo despues de estas producciones.
    Los lotes de dias anteriores quedan cerrados (la mayoria a mano, el resto automaticamente al terminar el dia)
    y los de hoy quedan abiertos, para poder corregir su consumo o cerrarlos.
    """
    azar = random.Random(27)
    azar_consumo = random.Random(31)
    azar_cierre = random.Random(43)
    hoy = date.today()
    ahora = datetime.now()
    responsables = db.query(Empleado).filter(Empleado.legajo.in_(["EMP-1000", "EMP-1001"])).all()
    lotes = []
    insumos = {}
    for insumo in db.query(Insumo).all():
        base = unidades_medida_services.unidad_base(db, insumo.unidad_medida.magnitud)
        insumos[insumo.nombre] = (insumo, base.id)

    for nombre, tipo, nombre_unidad, stock, dias_semana, (minimo, maximo) in DATOS_PRODUCTOS:
        unidad = db.query(UnidadMedida).filter_by(nombre=nombre_unidad).first()
        producto = Producto(nombre=nombre, tipo=tipo, stock=stock, unidad_medida_id=unidad.id)
        db.add(producto)
        db.flush()

        for dias_atras in range(DIAS_DE_PRODUCCION, -1, -1):
            fecha = hoy - timedelta(days=dias_atras)
            if fecha.weekday() in dias_semana:
                lotes.append((fecha, producto, azar.randint(minimo, maximo)))

    lotes.sort(key=lambda lote: lote[0])
    registros = []
    for fecha, producto, cantidad in lotes:
        lote = LoteProduccion(producto_id=producto.id, fecha=fecha, cantidad=cantidad)
        if fecha == hoy:
            lote.fecha_registro = max(datetime.combine(hoy, time.min), ahora - timedelta(minutes=azar_cierre.randint(5, 90)))
        else:
            lote.fecha_registro = datetime.combine(fecha, time(azar_cierre.randint(13, 18), azar_cierre.randint(0, 59)))
            if responsables and azar_cierre.random() < PROPORCION_CERRADOS_A_MANO:
                lote.fecha_cierre = lote.fecha_registro + timedelta(minutes=azar_cierre.randint(20, 120))
                lote.cerrado_por_id = azar_cierre.choice(responsables).id
        registros.append((lote, producto.nombre))
    db.add_all(lote for lote, _ in registros)
    db.flush()

    consumos = [
        {"lote_id": lote.nro_lote, **consumo}
        for lote, nombre_producto in registros
        for consumo in consumos_del_lote(nombre_producto, lote.cantidad, insumos, azar_consumo)
    ]
    if consumos:
        db.execute(insert(lote_insumo), consumos)
    db.commit()
    lotes_produccion_services.cerrar_lotes_vencidos(db)
    return len(lotes)


INSUMOS_ALIMENTARIOS = [
    ("Harina 000", "Kilogramos", 50),
    ("Azúcar Blanca", "Kilogramos", 20),
    ("Levadura Fresca", "Kilogramos", 2),
    ("Sal Fina", "Kilogramos", 5),
    ("Manteca", "Kilogramos", 10),
    ("Leche Entera", "Litros", 30),
    ("Aceite de Girasol", "Litros", 10),
    ("Naranjas", "Kilogramos", 40),
    ("Harina Integral", "Kilogramos", 25),
    ("Harina de Arroz", "Kilogramos", 10),
    ("Harina de Maíz (Polenta)", "Kilogramos", 15),
    ("Almidón de Maíz", "Kilogramos", 8),
    ("Avena Arrollada", "Kilogramos", 6),
    ("Azúcar Morena", "Kilogramos", 5),
    ("Dulce de Leche", "Kilogramos", 20),
    ("Dulce de Batata", "Kilogramos", 8),
    ("Mermelada de Frutas", "Kilogramos", 6),
    ("Miel", "Kilogramos", 4),
    ("Cacao en Polvo", "Kilogramos", 3),
    ("Chocolate para Taza", "Kilogramos", 5),
    ("Huevo Entero", "Kilogramos", 30),
    ("Yema de Huevo", "Kilogramos", 5),
    ("Clara de Huevo", "Kilogramos", 5),
    ("Crema de Leche", "Litros", 12),
    ("Queso Crema", "Kilogramos", 6),
    ("Ricota", "Kilogramos", 8),
    ("Queso Muzzarella", "Kilogramos", 20),
    ("Margarina", "Kilogramos", 10),
    ("Grasa Vacuna", "Kilogramos", 15),
    ("Aceite de Oliva", "Litros", 5),
    ("Nueces", "Kilogramos", 3),
    ("Almendras", "Kilogramos", 3),
    ("Pasas de Uva", "Kilogramos", 4),
    ("Manzanas", "Kilogramos", 20),
    ("Bananas", "Kilogramos", 15),
    ("Tomate Fresco", "Kilogramos", 25),
    ("Puré de Tomate", "Kilogramos", 18),
    ("Polvo de Hornear", "Kilogramos", 2),
    ("Bicarbonato de Sodio", "Kilogramos", 1),
    ("Esencia de Vainilla", "Litros", 1),
]


def crear_insumos(db: Session) -> int:
    """Crea los insumos alimentarios con su stock, que se guarda en gramos o mililitros."""
    for nombre, nombre_unidad, stock in INSUMOS_ALIMENTARIOS:
        unidad = db.query(UnidadMedida).filter_by(nombre=nombre_unidad).first()
        db.add(Insumo(
            nombre=nombre,
            unidad_medida_id=unidad.id,
            cantidad=unidades_medida_services.convertir_a_base(stock, unidad),
        ))
    db.commit()
    return len(INSUMOS_ALIMENTARIOS)


CARPETA_DATOS = Path(__file__).resolve().parent / "data"
CSV_ALIMENTOS_SARA = CARPETA_DATOS / "alimentos_sara.csv"
CSV_COMPLEMENTO_SARA2 = CARPETA_DATOS / "alimentos_sara2_complemento.csv"

NUTRIENTES_DEL_CSV = [
    Nutriente.ENERGIA,
    Nutriente.CARBOHIDRATOS,
    Nutriente.PROTEINAS,
    Nutriente.GRASAS_TOTALES,
    Nutriente.GRASAS_SATURADAS,
    Nutriente.FIBRA_ALIMENTARIA,
    Nutriente.SODIO,
]

TODOS_LOS_NUTRIENTES = list(Nutriente)

DATOS_DESDE_SARA = [
    ("Harina 000", "A033", TODOS_LOS_NUTRIENTES),
    ("Azúcar Blanca", "D003", TODOS_LOS_NUTRIENTES),
    ("Leche Entera", "L006", TODOS_LOS_NUTRIENTES),
    ("Manteca", "G010", NUTRIENTES_DEL_CSV),
    ("Naranjas", "F031", TODOS_LOS_NUTRIENTES),
    ("Harina Integral", "A034", TODOS_LOS_NUTRIENTES),
    ("Harina de Arroz", "A028", TODOS_LOS_NUTRIENTES),
    ("Harina de Maíz (Polenta)", "A031", TODOS_LOS_NUTRIENTES),
    ("Almidón de Maíz", "A001", TODOS_LOS_NUTRIENTES),
    ("Avena Arrollada", "A005", TODOS_LOS_NUTRIENTES),
    ("Azúcar Morena", "D004", TODOS_LOS_NUTRIENTES),
    ("Dulce de Leche", "D008", TODOS_LOS_NUTRIENTES),
    ("Dulce de Batata", "D005", TODOS_LOS_NUTRIENTES),
    ("Mermelada de Frutas", "D010", TODOS_LOS_NUTRIENTES),
    ("Miel", "D011", TODOS_LOS_NUTRIENTES),
    ("Cacao en Polvo", "D018", TODOS_LOS_NUTRIENTES),
    ("Chocolate para Taza", "D016", TODOS_LOS_NUTRIENTES),
    ("Huevo Entero", "U001", TODOS_LOS_NUTRIENTES),
    ("Yema de Huevo", "U003", TODOS_LOS_NUTRIENTES),
    ("Clara de Huevo", "U002", TODOS_LOS_NUTRIENTES),
    ("Crema de Leche", "G013", TODOS_LOS_NUTRIENTES),
    ("Queso Crema", "Q001", TODOS_LOS_NUTRIENTES),
    ("Ricota", "Q004", TODOS_LOS_NUTRIENTES),
    ("Queso Muzzarella", "Q006", TODOS_LOS_NUTRIENTES),
    ("Margarina", "G011", TODOS_LOS_NUTRIENTES),
    ("Grasa Vacuna", "G009", TODOS_LOS_NUTRIENTES),
    ("Aceite de Oliva", "G004", TODOS_LOS_NUTRIENTES),
    ("Nueces", "F033", TODOS_LOS_NUTRIENTES),
    ("Almendras", "F002", TODOS_LOS_NUTRIENTES),
    ("Pasas de Uva", "F035", TODOS_LOS_NUTRIENTES),
    ("Manzanas", "F027", TODOS_LOS_NUTRIENTES),
    ("Bananas", "F006", TODOS_LOS_NUTRIENTES),
    ("Tomate Fresco", "H038", TODOS_LOS_NUTRIENTES),
    ("Puré de Tomate", "H039", TODOS_LOS_NUTRIENTES),
]

DATOS_DESDE_BIBLIOGRAFIA = [
    (
        "Levadura Fresca",
        "SARA 2 (PDF): Levadura fresca",
        {
            Nutriente.ENERGIA: 91,
            Nutriente.CARBOHIDRATOS: 10.0,
            Nutriente.AZUCARES_TOTALES: 0,
            Nutriente.AZUCARES_ANADIDOS: 0,
            Nutriente.PROTEINAS: 8.4,
            Nutriente.GRASAS_TOTALES: 1.9,
            Nutriente.GRASAS_SATURADAS: 0.24,
            Nutriente.GRASAS_TRANS: 0,
            Nutriente.FIBRA_ALIMENTARIA: 8.1,
            Nutriente.SODIO: 30,
        },
    ),
    ("Sal Fina", "SARA 2 (PDF): Sal", {nutriente: 0 for nutriente in Nutriente} | {Nutriente.SODIO: 40000}),
]


def cargar_datos_nutricionales_de_ejemplo(db: Session) -> int:
    """Importa la base SARA (CSV mas el complemento de SARA 2) y carga datos de algunos insumos.

    De cada alimento se cargan los nutrientes que SARA informa: los que no tienen equivalente en el PDF
    de SARA 2 quedan incompletos (sin azucares ni grasas trans), igual que la manteca, que se carga a
    proposito solo con lo que trae el CSV. El aceite de girasol y los aditivos (polvo de hornear,
    bicarbonato, esencia) quedan sin datos, y en la harina el sodio aparece modificado a mano.
    """
    alimentos_referencia_services.importar_desde_csv(db, CSV_ALIMENTOS_SARA)
    alimentos_referencia_services.importar_complemento_sara2(db, CSV_COMPLEMENTO_SARA2)
    administradora = db.query(Empleado).filter_by(legajo="EMP-1001").first()
    supervisor = db.query(Empleado).filter_by(legajo="EMP-1000").first()

    def cargar(nombre_insumo: str, empleado: Empleado, datos: list) -> bool:
        insumo = db.query(Insumo).filter_by(nombre=nombre_insumo).first()
        if insumo is None:
            return False
        datos_nutricionales_services.cargar_datos(
            db, insumo.id, CargaDatosNutricionales(empleado_id=empleado.id, datos=datos)
        )
        return True

    cargados = 0
    for nombre, codigo, nutrientes in DATOS_DESDE_SARA:
        alimento = alimentos_referencia_services.leer_alimento(db, codigo)
        datos = [
            {
                "nutriente": nutriente,
                "valor": alimentos_referencia_services.valor_de(alimento, nutriente),
                "fuente": FuenteDatoNutricional.SARA,
                "alimento_codigo": codigo,
            }
            for nutriente in nutrientes
            if alimentos_referencia_services.valor_de(alimento, nutriente) is not None
        ]
        cargados += cargar(nombre, administradora, datos)

    for nombre, referencia, valores in DATOS_DESDE_BIBLIOGRAFIA:
        datos = [
            {"nutriente": nutriente, "valor": valor, "fuente": FuenteDatoNutricional.BIBLIOGRAFIA, "referencia": referencia}
            for nutriente, valor in valores.items()
        ]
        cargados += cargar(nombre, administradora, datos)

    cargar("Harina 000", supervisor, [
        {"nutriente": Nutriente.SODIO, "valor": 2.0, "fuente": FuenteDatoNutricional.SARA, "alimento_codigo": "A033"}
    ])
    return cargados


def seed_database(reset: bool = True):
    if reset:
        print("Recreando las tablas de la base de datos...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    else:
        Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    try:
        print("Iniciando el poblamiento completo de la base de datos...")

        # --- UNIDADES DE MEDIDA ---
        unidades_creadas = unidades_medida_services.crear_catalogo(db)
        if unidades_creadas:
            print(f"Unidades de medida creadas ({unidades_creadas}).")

        # --- CAPACIDADES ---
        if db.query(Capacidad).count() == 0:
            capacidades = [
                Capacidad(nombre="Administrador"), 
                Capacidad(nombre="Operario"),
                Capacidad(nombre="Supervisor de Calidad"),
                Capacidad(nombre="Técnico de Mantenimiento")
            ]
            db.add_all(capacidades)
            db.commit()
            print("Capacidades creadas (4).")

        # --- INSUMOS ---
        if db.query(Insumo).count() == 0:
            print(f"Insumos alimentarios creados ({crear_insumos(db)}).")

        # --- EMPLEADOS ---
        if db.query(Empleado).count() == 0:
            c_admin = db.query(Capacidad).filter_by(nombre="Administrador").first()
            c_operario = db.query(Capacidad).filter_by(nombre="Operario").first()
            c_supervisor = db.query(Capacidad).filter_by(nombre="Supervisor de Calidad").first()
            c_tecnico = db.query(Capacidad).filter_by(nombre="Técnico de Mantenimiento").first()

            empleados = [
                Empleado(legajo="EMP-1000", dni="11111111", nombre="Carlos", apellido="Gómez", activo=True, rol=RolEmpleado.ADMIN),
                Empleado(legajo="EMP-1001", dni="22222222", nombre="María", apellido="Pérez", activo=True, rol=RolEmpleado.ADMIN),
                Empleado(legajo="EMP-1002", dni="33333333", nombre="Juan", apellido="López", activo=True, rol=RolEmpleado.OPERARIO),
                Empleado(legajo="EMP-1003", dni="44444444", nombre="Lucía", apellido="Martínez", activo=True, rol=RolEmpleado.OPERARIO),
                Empleado(legajo="EMP-1004", dni="55555555", nombre="Pedro", apellido="Sánchez", activo=False, rol=RolEmpleado.OPERARIO),
                Empleado(legajo="EMP-1005", dni="66666666", nombre="Ana", apellido="García", activo=True, rol=RolEmpleado.OPERARIO),
                Empleado(legajo="EMP-1006", dni="77777777", nombre="Diego", apellido="Fernández", activo=True, rol=RolEmpleado.OPERARIO),
                Empleado(legajo="EMP-1007", dni="88888888", nombre="Sofía", apellido="Romero", activo=True, rol=RolEmpleado.OPERARIO),
            ]

            if c_admin:
                empleados[0].capacidades.append(c_admin)
                empleados[1].capacidades.append(c_admin)

            if c_supervisor:
                empleados[1].capacidades.append(c_supervisor)
                empleados[5].capacidades.append(c_supervisor)

            if c_tecnico:
                empleados[6].capacidades.append(c_tecnico)

            if c_operario:
                for emp in empleados[2:]:
                    emp.capacidades.append(c_operario)

            db.add_all(empleados)
            db.commit()
            print("Empleados creados (8).")

        # --- SECTORES ---
        if db.query(Sector).count() == 0:
            carlos_admin = db.query(Empleado).filter_by(legajo="EMP-1000").first()
            maria_admin = db.query(Empleado).filter_by(legajo="EMP-1001").first()
            juan_op = db.query(Empleado).filter_by(legajo="EMP-1002").first()
            lucia_op = db.query(Empleado).filter_by(legajo="EMP-1003").first()
            ana_op = db.query(Empleado).filter_by(legajo="EMP-1005").first()
            diego_op = db.query(Empleado).filter_by(legajo="EMP-1006").first()
            sofia_op = db.query(Empleado).filter_by(legajo="EMP-1007").first()

            sectores = [
                Sector(
                    nombre="Depósito Frío",
                    responsable_id=carlos_admin.id if carlos_admin else None,
                    empleados=[emp for emp in [carlos_admin, juan_op] if emp]
                ),
                Sector(
                    nombre="Sector Cocción",
                    responsable_id=maria_admin.id if maria_admin else None,
                    empleados=[emp for emp in [maria_admin, lucia_op] if emp]
                ),
                Sector(
                    nombre="Recepción de Materia Prima",
                    responsable_id=carlos_admin.id if carlos_admin else None,
                    empleados=[emp for emp in [carlos_admin, ana_op] if emp]
                ),
                Sector(
                    nombre="Sector Preparación",
                    responsable_id=maria_admin.id if maria_admin else None,
                    empleados=[emp for emp in [maria_admin, diego_op] if emp]
                ),
                Sector(
                    nombre="Control de Calidad",
                    responsable_id=carlos_admin.id if carlos_admin else None,
                    empleados=[emp for emp in [carlos_admin, sofia_op] if emp]
                ),
                Sector(
                    nombre="Mantenimiento",
                    responsable_id=maria_admin.id if maria_admin else None,
                    empleados=[emp for emp in [maria_admin, juan_op, diego_op] if emp]
                ),
                Sector(
                    nombre="Sector Empaque",
                    responsable_id=carlos_admin.id if carlos_admin else None,
                    empleados=[emp for emp in [carlos_admin, lucia_op, sofia_op] if emp]
                ),
                Sector(
                    nombre="Laboratorio de Calidad",
                    responsable_id=maria_admin.id if maria_admin else None,
                    empleados=[emp for emp in [maria_admin, ana_op] if emp]
                ),
                Sector(
                    nombre="Línea de Producción",
                    responsable_id=carlos_admin.id if carlos_admin else None,
                    empleados=[emp for emp in [carlos_admin, juan_op, diego_op] if emp]
                )
            ]

            db.add_all(sectores)
            db.commit()
            print("Sectores creados (9).")

        # --- TIPOS DE EQUIPO ---
        if db.query(TipoEquipo).count() == 0:
            tipos = [
                TipoEquipo(nombre="Heladera"),
                TipoEquipo(nombre="Horno"),
                TipoEquipo(nombre="Balanza"),
                TipoEquipo(nombre="Amasadora"),
                TipoEquipo(nombre="Termómetro"),
                TipoEquipo(nombre="Cortadora"),
                TipoEquipo(nombre="Envasadora"),
                TipoEquipo(nombre="Mezcladora"),
                TipoEquipo(nombre="Pasteurizador"),
                TipoEquipo(nombre="Cinta Transportadora"),
                TipoEquipo(nombre="Detector de Metales")
            ]
            db.add_all(tipos)
            db.commit()
            print("Tipos de equipo creados (11).")

        # --- EQUIPOS ---
        if db.query(Equipo).count() == 0:
            t_heladera = db.query(TipoEquipo).filter_by(nombre="Heladera").first().id
            t_horno = db.query(TipoEquipo).filter_by(nombre="Horno").first().id
            t_balanza = db.query(TipoEquipo).filter_by(nombre="Balanza").first().id
            t_amasadora = db.query(TipoEquipo).filter_by(nombre="Amasadora").first().id
            t_termometro = db.query(TipoEquipo).filter_by(nombre="Termómetro").first().id
            t_cortadora = db.query(TipoEquipo).filter_by(nombre="Cortadora").first().id
            t_envasadora = db.query(TipoEquipo).filter_by(nombre="Envasadora").first().id
            t_mezcladora = db.query(TipoEquipo).filter_by(nombre="Mezcladora").first().id
            t_cinta = db.query(TipoEquipo).filter_by(nombre="Cinta Transportadora").first().id
            t_detector = db.query(TipoEquipo).filter_by(nombre="Detector de Metales").first().id

            s_frio = db.query(Sector).filter_by(nombre="Depósito Frío").first().id
            s_coccion = db.query(Sector).filter_by(nombre="Sector Cocción").first().id
            s_recepcion = db.query(Sector).filter_by(nombre="Recepción de Materia Prima").first().id
            s_preparacion = db.query(Sector).filter_by(nombre="Sector Preparación").first().id
            s_calidad = db.query(Sector).filter_by(nombre="Control de Calidad").first().id
            s_mantenimiento = db.query(Sector).filter_by(nombre="Mantenimiento").first().id
            s_empaque = db.query(Sector).filter_by(nombre="Sector Empaque").first().id
            s_laboratorio = db.query(Sector).filter_by(nombre="Laboratorio de Calidad").first().id
            s_produccion = db.query(Sector).filter_by(nombre="Línea de Producción").first().id

            hoy_eq = date.today()

            equipos = [
                Equipo(nombre="Heladera Cámara 1", activo=True, tipo_id=t_heladera, sector_id=s_frio),
                Equipo(nombre="Horno Rotativo", activo=True, tipo_id=t_horno, sector_id=s_coccion),
                Equipo(nombre="Balanza Digital 30kg", activo=True, tipo_id=t_balanza, sector_id=s_recepcion, frecuencia_mantenimiento_dias=180, fecha_ultimo_mantenimiento=hoy_eq - timedelta(days=200)),
                Equipo(nombre="Amasadora Industrial 50kg", activo=True, tipo_id=t_amasadora, sector_id=s_preparacion),
                Equipo(nombre="Termómetro Infrarrojo", activo=True, tipo_id=t_termometro, sector_id=s_calidad, frecuencia_mantenimiento_dias=90, fecha_ultimo_mantenimiento=hoy_eq - timedelta(days=85)),
                Equipo(nombre="Termómetro de Pinche", activo=True, tipo_id=t_termometro, sector_id=s_coccion, frecuencia_mantenimiento_dias=90, fecha_ultimo_mantenimiento=hoy_eq - timedelta(days=45)),
                Equipo(nombre="Cámara de Congelados", activo=True, tipo_id=t_heladera, sector_id=s_frio),
                Equipo(nombre="Cortadora de Fiambre", activo=False, estado="danado", tipo_id=t_cortadora, sector_id=s_mantenimiento),
                Equipo(nombre="Envasadora al Vacío", activo=True, tipo_id=t_envasadora, sector_id=s_empaque),
                Equipo(nombre="Mezcladora de Polvos 100L", activo=True, tipo_id=t_mezcladora, sector_id=s_preparacion),
                Equipo(nombre="Balanza de Precisión", activo=True, tipo_id=t_balanza, sector_id=s_laboratorio, frecuencia_mantenimiento_dias=365, fecha_ultimo_mantenimiento=hoy_eq - timedelta(days=30)),
                Equipo(nombre="Cinta Transportadora Ppal", activo=True, tipo_id=t_cinta, sector_id=s_produccion),
                Equipo(nombre="Detector de Metales Fin de Línea", activo=True, tipo_id=t_detector, sector_id=s_empaque, frecuencia_mantenimiento_dias=120, fecha_ultimo_mantenimiento=hoy_eq - timedelta(days=118)),
                Equipo(nombre="Horno Convector Secundario", activo=False, estado="danado", tipo_id=t_horno, sector_id=s_mantenimiento)
            ]
            db.add_all(equipos)
            db.commit()
            print("Equipos creados (14).")

        # --- CALIBRACIONES REALIZADAS ---
        if db.query(CalibracionRealizada).count() == 0:
            balanza_recepcion = db.query(Equipo).filter_by(nombre="Balanza Digital 30kg").first()
            termometro_calidad = db.query(Equipo).filter_by(nombre="Termómetro Infrarrojo").first()
            balanza_lab = db.query(Equipo).filter_by(nombre="Balanza de Precisión").first()
            detector_empaque = db.query(Equipo).filter_by(nombre="Detector de Metales Fin de Línea").first()
            termometro_pinche = db.query(Equipo).filter_by(nombre="Termómetro de Pinche").first()

            hoy_cal = date.today()
            calibraciones = []

            if balanza_recepcion:
                calibraciones.append(CalibracionRealizada(equipo_id=balanza_recepcion.id, fecha=hoy_cal - timedelta(days=200), certificacion_url=PDF_SIMULADO))
                calibraciones.append(CalibracionRealizada(equipo_id=balanza_recepcion.id, fecha=hoy_cal - timedelta(days=380), certificacion_url=PDF_SIMULADO))

            if termometro_calidad:
                calibraciones.append(CalibracionRealizada(equipo_id=termometro_calidad.id, fecha=hoy_cal - timedelta(days=85), certificacion_url=PDF_SIMULADO))
                calibraciones.append(CalibracionRealizada(equipo_id=termometro_calidad.id, fecha=hoy_cal - timedelta(days=175), certificacion_url=PDF_SIMULADO))

            if balanza_lab:
                calibraciones.append(CalibracionRealizada(equipo_id=balanza_lab.id, fecha=hoy_cal - timedelta(days=30), certificacion_url=PDF_SIMULADO))
                calibraciones.append(CalibracionRealizada(equipo_id=balanza_lab.id, fecha=hoy_cal - timedelta(days=395), certificacion_url=PDF_SIMULADO))

            if detector_empaque:
                calibraciones.append(CalibracionRealizada(equipo_id=detector_empaque.id, fecha=hoy_cal - timedelta(days=118), certificacion_url=PDF_SIMULADO))

            if termometro_pinche:
                calibraciones.append(CalibracionRealizada(equipo_id=termometro_pinche.id, fecha=hoy_cal - timedelta(days=45), certificacion_url=PDF_SIMULADO))

            db.add_all(calibraciones)
            db.commit()
            print(f"Calibraciones Realizadas creadas ({len(calibraciones)}).")

        # --- PRODUCTOS DE LIMPIEZA ---
        if db.query(ProductoLimpieza).count() == 0:
            u_l = db.query(UnidadMedida).filter_by(nombre="Litros").first().id
            u_u = db.query(UnidadMedida).filter_by(nombre="Unidades").first().id

            productos_limpieza = [
                ProductoLimpieza(nombre="Hipoclorito 10%", tipo=TipoProductoLimpieza.DESINFECTANTE, stock=100.0, unidad_medida_id=u_l),
                ProductoLimpieza(nombre="Detergente Enzimático", tipo=TipoProductoLimpieza.DETERGENTE, stock=50.0, unidad_medida_id=u_l),
                ProductoLimpieza(nombre="Desengrasante Alcalino", tipo=TipoProductoLimpieza.DESENGRASANTE, stock=75.0, unidad_medida_id=u_l),
                ProductoLimpieza(nombre="Paños de Microfibra", tipo=TipoProductoLimpieza.OTRO, stock=200.0, unidad_medida_id=u_u),
                ProductoLimpieza(nombre="Alcohol Etílico 70%", tipo=TipoProductoLimpieza.DESINFECTANTE, stock=40.0, unidad_medida_id=u_l),
                ProductoLimpieza(nombre="Jabón Bactericida", tipo=TipoProductoLimpieza.DETERGENTE, stock=30.0, unidad_medida_id=u_l),
                ProductoLimpieza(nombre="Amonio Cuaternario", tipo=TipoProductoLimpieza.DESINFECTANTE, stock=0.0, unidad_medida_id=u_l),
                ProductoLimpieza(nombre="Detergente Neutro", tipo=TipoProductoLimpieza.DETERGENTE, stock=3.0, unidad_medida_id=u_l),
            ]
            db.add_all(productos_limpieza)
            db.commit()
            print(f"Productos de Limpieza creados ({len(productos_limpieza)}).")

        # --- TAREAS ---
        if db.query(Tarea).count() == 0:
            productos = {p.nombre: p.id for p in db.query(ProductoLimpieza).all()}

            for titulo, frecuencia, consumos in DATOS_TAREAS:
                tarea = Tarea(titulo=titulo, frecuencia=frecuencia)
                tarea.consumos_estimados = [
                    ConsumoEstimado(producto_limpieza_id=productos[producto], cantidad=cantidad)
                    for producto, cantidad in consumos
                    if producto in productos
                ]
                db.add(tarea)
            db.commit()
            print(f"Tareas y Consumos Estimados creados ({len(DATOS_TAREAS)} tareas).")

        # --- PLANES DE LIMPIEZA ---
        if db.query(Plan).count() == 0:
            hoy = date.today()
            sectores = {s.nombre: s for s in db.query(Sector).all()}
            equipos = {e.nombre: e for e in db.query(Equipo).all()}
            tareas = {t.titulo: t for t in db.query(Tarea).all()}

            planes = [
                Plan(
                    titulo=titulo,
                    fecha_inicio=hoy - timedelta(days=dias_desde_inicio),
                    sector_id=sectores[sector].id,
                    equipos=[equipos[nombre] for nombre in nombres_equipos if nombre in equipos],
                    tareas=[tareas[nombre] for nombre in nombres_tareas if nombre in tareas],
                )
                for titulo, sector, dias_desde_inicio, nombres_equipos, nombres_tareas in DATOS_PLANES
            ]
            db.add_all(planes)
            db.commit()
            print(f"Planes de Limpieza creados ({len(planes)}).")

        # --- ELEMENTOS DE LIMPIEZA ---
        if db.query(ElementoLimpieza).count() == 0:
            hoy = date.today()
            elementos = [
                ElementoLimpieza(
                    nombre=nombre,
                    frecuencia_recambio_dias=frecuencia,
                    fecha_ultimo_recambio=hoy - timedelta(days=dias_desde_recambio),
                )
                for nombre, frecuencia, dias_desde_recambio in DATOS_ELEMENTOS
            ]
            db.add_all(elementos)
            db.commit()
            print(f"Elementos de Limpieza creados ({len(elementos)}).")

        # --- CHECKLISTS ---
        if db.query(Checklist).count() == 0:
            checklists_seed = generar_historial_checklists(db)
            db.add_all(checklists_seed)
            db.commit()
            print(f"Historial de Checklists creado ({len(checklists_seed)} ejecuciones en {DIAS_DE_HISTORIAL} días).")

        # --- REQUISITOS DE DOCUMENTACION ---
        if db.query(RequisitoDocumentacion).count() == 0:
            db.add_all([
                RequisitoDocumentacion(
                    tipo=TipoDocumentacion.LIBRETA_SANITARIA,
                    obligatorio=True,
                    dias_aviso_previo=150,
                ),
                RequisitoDocumentacion(
                    tipo=TipoDocumentacion.CAPACITACION,
                    obligatorio=False,
                    dias_aviso_previo=30,
                ),
                RequisitoDocumentacion(
                    tipo=TipoDocumentacion.CERTIFICADO_APTITUD_FISICA,
                    obligatorio=False,
                    dias_aviso_previo=30,
                ),
            ])
            db.commit()
            print("Requisitos de documentacion creados (3).")

        # --- DOCUMENTACION ---
        if db.query(Documentacion).count() == 0:
            hoy_doc = date.today()
            empleados_doc = {e.legajo: e for e in db.query(Empleado).all()}

            libretas = [
                LibretaSanitaria(
                    empleado_id=empleados_doc[legajo].id,
                    numero_carnet=f"LS-{1000 + indice}",
                    autoridad_emisora="Municipalidad de Trelew",
                    fecha_vencimiento=hoy_doc + timedelta(days=dias),
                    archivo_url=PDF_SIMULADO,
                    archivo_nombre=f"libreta_sanitaria_{legajo}.pdf"
                )
                for indice, (legajo, dias) in enumerate(DATOS_LIBRETAS)
                if legajo in empleados_doc
            ]
            capacitaciones = [
                Capacitacion(
                    empleado_id=empleados_doc[legajo].id,
                    titulo=titulo,
                    observaciones=observaciones,
                    fecha_vencimiento=hoy_doc + timedelta(days=dias),
                    archivo_url=PDF_SIMULADO,
                    archivo_nombre=f"certificado_{legajo}.pdf"
                )
                for legajo, titulo, dias, observaciones in DATOS_CAPACITACIONES
                if legajo in empleados_doc
            ]
            certificados = [
                CertificadoAptitudFisica(
                    empleado_id=empleados_doc[legajo].id,
                    nombre_medico=medico,
                    matricula=matricula,
                    fecha_vencimiento=hoy_doc + timedelta(days=dias),
                    archivo_url=PDF_SIMULADO,
                    archivo_nombre=f"aptitud_fisica_{legajo}.pdf"
                )
                for legajo, medico, matricula, dias in DATOS_CERTIFICADOS
                if legajo in empleados_doc
            ]
            db.add_all(libretas + capacitaciones + certificados)
            db.commit()
            print(
                f"Documentación creada ({len(libretas)} libretas, "
                f"{len(capacitaciones)} capacitaciones, {len(certificados)} certificados)."
            )

        # --- INCIDENTES ---
        if db.query(Incidente).count() == 0:
            cantidad_incidentes, cantidad_movimientos = generar_incidentes(db)
            print(f"Incidentes creados ({cantidad_incidentes}, con {cantidad_movimientos} cierres y reaperturas).")

        # --- DOCUMENTOS VERSIONADOS ---
        if db.query(DocumentoVersionado).count() == 0:
            carlos_admin = db.query(Empleado).filter_by(legajo="EMP-1000").first()
            admin_id = carlos_admin.id if carlos_admin else None

            doc_bpm = DocumentoVersionado(
                nombre="Manual de Buenas Prácticas de Manufactura (BPM)",
                tipo=TipoDocumentoVersionado.MANUAL_BPM,
            )
            doc_poes = DocumentoVersionado(
                nombre="POES - Sanitización de Equipos y Superficies",
                tipo=TipoDocumentoVersionado.PROCEDIMIENTO,
            )
            doc_ficha = DocumentoVersionado(
                nombre="Ficha Técnica - Harina de Trigo 000",
                tipo=TipoDocumentoVersionado.FICHA_TECNICA,
            )
            doc_haccp = DocumentoVersionado(
                nombre="Plan de Análisis de Peligros y Puntos Críticos de Control (HACCP)",
                tipo=TipoDocumentoVersionado.MANUAL_BPM,
            )
            doc_plagas = DocumentoVersionado(
                nombre="Instructivo de Manejo Integrado de Plagas (MIP)",
                tipo=TipoDocumentoVersionado.PROCEDIMIENTO,
            )

            db.add_all([doc_bpm, doc_poes, doc_ficha, doc_haccp, doc_plagas])
            db.commit()
            for doc in [doc_bpm, doc_poes, doc_ficha, doc_haccp, doc_plagas]:
                db.refresh(doc)

            hoy_d = date.today()
            db.execute(
                insert(version_documento).values([
                    {
                        "documentos_versionados_id": doc_bpm.id,
                        "version": 1,
                        "estado": EstadoVersionDocumento.ARCHIVADO,
                        "version_documento_url": PDF_SIMULADO,
                        "fecha_vigencia": hoy_d - timedelta(days=60),
                        "fecha_subida": datetime.now() - timedelta(days=60),
                        "subido_por_id": admin_id,
                        "archivo_nombre": "manual_bpm_v1.pdf",
                    },
                    {
                        "documentos_versionados_id": doc_bpm.id,
                        "version": 2,
                        "estado": EstadoVersionDocumento.ACTIVO,
                        "version_documento_url": PDF_SIMULADO,
                        "fecha_vigencia": (datetime.now() - timedelta(hours=6)).date(),
                        "fecha_subida": datetime.now() - timedelta(hours=6),
                        "subido_por_id": admin_id,
                        "archivo_nombre": "manual_bpm_v2.pdf",
                    },
                    {
                        "documentos_versionados_id": doc_poes.id,
                        "version": 1,
                        "estado": EstadoVersionDocumento.ACTIVO,
                        "version_documento_url": PDF_SIMULADO,
                        "fecha_vigencia": hoy_d - timedelta(days=15),
                        "fecha_subida": datetime.now() - timedelta(days=15),
                        "subido_por_id": admin_id,
                        "archivo_nombre": "poes_sanitizacion_v1.pdf",
                    },
                    {
                        "documentos_versionados_id": doc_ficha.id,
                        "version": 1,
                        "estado": EstadoVersionDocumento.ACTIVO,
                        "version_documento_url": PDF_SIMULADO,
                        "fecha_vigencia": hoy_d - timedelta(days=4),
                        "fecha_subida": datetime.now() - timedelta(days=4, hours=6),
                        "subido_por_id": admin_id,
                        "archivo_nombre": "ficha_harina_000.pdf",
                    },
                    {
                        "documentos_versionados_id": doc_haccp.id,
                        "version": 1,
                        "estado": EstadoVersionDocumento.ACTIVO,
                        "version_documento_url": PDF_SIMULADO,
                        "fecha_vigencia": hoy_d - timedelta(days=90),
                        "fecha_subida": datetime.now() - timedelta(days=90),
                        "subido_por_id": admin_id,
                        "archivo_nombre": "plan_haccp_v1.pdf",
                    },
                    {
                        "documentos_versionados_id": doc_plagas.id,
                        "version": 1,
                        "estado": EstadoVersionDocumento.ACTIVO,
                        "version_documento_url": PDF_SIMULADO,
                        "fecha_vigencia": hoy_d - timedelta(days=30),
                        "fecha_subida": datetime.now() - timedelta(days=30),
                        "subido_por_id": admin_id,
                        "archivo_nombre": "instructivo_mip_v1.pdf",
                    },
                ])
            )
            db.commit()
            print("Documentos Versionados y Versiones Históricas creados (5 documentos, 6 versiones).")

        if db.query(Producto).count() == 0:
            cantidad_lotes = generar_productos_y_lotes(db)
            print(f"Productos ({len(DATOS_PRODUCTOS)}) y lotes de produccion ({cantidad_lotes}) creados.")

        if db.query(AlimentoReferencia).count() == 0:
            insumos_con_datos = cargar_datos_nutricionales_de_ejemplo(db)
            print(f"Base de referencia SARA importada y datos nutricionales de {insumos_con_datos} insumos cargados.")

        print("Base de datos poblada exitosamente con datos de prueba enriquecidos para SAIA!")

    except Exception as e:
        db.rollback()
        print(f"Error al poblar la base de datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
