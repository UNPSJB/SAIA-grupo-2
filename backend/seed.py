import random
from datetime import date, datetime, time, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import  insert

from src.database import SessionLocal, engine
from src.models import Base
from src.capacidades.models import Capacidad
from src.empleados.models import Empleado, RolEmpleado
from src.equipos.models import Equipo, TipoEquipo
from src.insumos.models import Insumo
from src.unidades_medida.models import UnidadMedida
from src.sectores.models import Sector

from src.productos_limpieza.models import ProductoLimpieza
from src.productos_limpieza.constants import TipoProductoLimpieza
from src.tareas.models import Tarea, ConsumoEstimado
from src.tareas.constants import FrecuenciaTarea
from src.elementos_limpieza.models import ElementoLimpieza
from src.documentacion.constants import TipoDocumentacion
from src.documentacion.models import Documentacion, LibretaSanitaria, Capacitacion, CertificadoAptitudFisica, RequisitoDocumentacion
from src.planes.models import Plan
from src.checklists.models import Checklist, ConsumoReal
from src.incidentes.models import Incidente, MovimientoIncidente
from src.incidentes.constants import EstadoIncidente, TipoIncidente, TipoMovimiento


from src.documentos_versionados.models import DocumentoVersionado
from src.documentos_versionados.constants import TipoDocumentoVersionado
from src.asociaciones.version_documento import version_documento, EstadoVersionDocumento


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
    ("Trapo de piso", 30, 25),
    ("Esponja abrasiva", 60, 0),
    ("Guantes de nitrilo", 45, 10),
    ("Balde de 10 litros", None, 0),
    ("Escurridor de goma", 60, 57),
    ("Paños de microfibra (juego)", 15, 20),
    ("Cepillo para desagües", 120, 30),
    ("Escobillón", 90, 84),
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
    {
        "descripcion": "Pérdida de agua en la canilla de la pileta de lavado de manos",
        "tipo": TipoIncidente.ROTURA, "dias": 41, "hora": (13, 0), "reporta": "EMP-1003",
        "cierre": (1, 2, "Se cambió el cuerito y la canilla por una de accionamiento a pedal.", "EMP-1000"),
    },
    {
        "descripcion": "Cucarachas en el vestuario del personal",
        "tipo": TipoIncidente.PLAGA, "dias": 44, "hora": (7, 10), "reporta": "EMP-1006",
        "cierre": (2, 3, "Fumigación del vestuario y sellado de grietas en zócalos.", "EMP-1000"),
    },
    {
        "descripcion": "Operario sin cofia en la línea de producción",
        "tipo": TipoIncidente.OTRO, "dias": 47, "hora": (9, 15), "reporta": "EMP-1001",
        "cierre": (0, 1, "Se repuso el dispensador de cofias en el ingreso y se hizo una charla de 10 minutos.", "EMP-1001"),
    },
    {
        "descripcion": "Horno convector secundario no alcanza temperatura",
        "tipo": TipoIncidente.ROTURA, "dias": 50, "hora": (11, 25), "reporta": "EMP-1003",
        "cierre": (4, 3, "Se dio de baja el horno para reparación y se reorganizó la producción en el horno rotativo.", "EMP-1001"),
    },
    {
        "descripcion": "Cliente encontró un cuerpo extraño (hilo plástico) en el producto",
        "tipo": TipoIncidente.DEVOLUCION_CLIENTE, "dias": 54, "hora": (15, 30), "reporta": "EMP-1000",
        "cierre": (2, 6, "Se identificó el origen en la bolsa de harina; se agregó tamizado previo.", "EMP-1000"),
        "reapertura": (9, 2, "Segundo reclamo similar del mismo cliente.", "EMP-1001"),
    },
    {
        "descripcion": "Desagüe de la cámara de congelados tapado con hielo",
        "tipo": TipoIncidente.OTRO, "dias": 58, "hora": (8, 40), "reporta": "EMP-1002",
        "cierre": (1, 3, "Se instaló una resistencia en el desagüe y se agregó al plan de mantenimiento.", "EMP-1000"),
    },
    {
        "descripcion": "Pallets de madera con humedad en el depósito",
        "tipo": TipoIncidente.OTRO, "dias": 62, "hora": (10, 0), "reporta": "EMP-1004",
        "cierre": (3, 2, "Se reemplazaron por pallets plásticos en la zona de materia prima.", "EMP-1001"),
    },
    {
        "descripcion": "Polillas en bolsas de harina",
        "tipo": TipoIncidente.PLAGA, "dias": 66, "hora": (9, 50), "reporta": "EMP-1004",
        "cierre": (1, 5, "Se descartaron 12 bolsas y se reforzó el control de ingreso de materia prima.", "EMP-1000"),
    },
    {
        "descripcion": "Cuchilla de la cortadora de fiambre astillada",
        "tipo": TipoIncidente.ROTURA, "dias": 70, "hora": (14, 10), "reporta": "EMP-1002",
        "cierre": (1, 1, "Se retiró de servicio el equipo y se revisó el producto cortado ese día.", "EMP-1000"),
    },
    {
        "descripcion": "Distribuidor devolvió producto con fecha de vencimiento corta",
        "tipo": TipoIncidente.DEVOLUCION_CLIENTE, "dias": 74, "hora": (11, 35), "reporta": "EMP-1007",
        "cierre": (2, 2, "Se acordó con el distribuidor un mínimo de 20 días de vida útil al despacho.", "EMP-1001"),
    },
    {
        "descripcion": "Vidrio roto de una ventana del sector preparación",
        "tipo": TipoIncidente.ROTURA, "dias": 78, "hora": (7, 55), "reporta": "EMP-1006",
        "cierre": (0, 6, "Se aisló el sector, se descartó el producto expuesto y se colocó policarbonato.", "EMP-1000"),
    },
    {
        "descripcion": "Paloma dentro del depósito de producto terminado",
        "tipo": TipoIncidente.PLAGA, "dias": 83, "hora": (16, 20), "reporta": "EMP-1004",
        "cierre": (1, 2, "Se colocaron mallas en las aberturas superiores del depósito.", "EMP-1001"),
    },
    {
        "descripcion": "Corte de luz de 3 horas con la cámara cargada",
        "tipo": TipoIncidente.OTRO, "dias": 88, "hora": (13, 45), "reporta": "EMP-1002",
        "cierre": (0, 8, "Se verificaron temperaturas: el producto se mantuvo en rango. Se cotizó grupo electrógeno.", "EMP-1000"),
    },
    {
        "descripcion": "Reclamo por peso faltante en paquetes de 1 kg",
        "tipo": TipoIncidente.DEVOLUCION_CLIENTE, "dias": 95, "hora": (10, 25), "reporta": "EMP-1001",
        "cierre": (3, 3, "Se recalibró la envasadora y se agregó control de peso por muestreo cada hora.", "EMP-1001"),
    },
    {
        "descripcion": "Hormigas en la zona de empaque",
        "tipo": TipoIncidente.PLAGA, "dias": 102, "hora": (8, 30), "reporta": "EMP-1004",
        "cierre": (2, 1, "Aplicación de gel cebo y limpieza profunda del sector.", "EMP-1000"),
    },
    {
        "descripcion": "Manguera de la hidrolavadora perforada",
        "tipo": TipoIncidente.ROTURA, "dias": 110, "hora": (17, 0), "reporta": "EMP-1006",
        "cierre": (5, 2, "Se compró una manguera nueva de alta presión.", "EMP-1001"),
    },
    {
        "descripcion": "Ratas avistadas en el patio de contenedores de residuos",
        "tipo": TipoIncidente.PLAGA, "dias": 118, "hora": (19, 10), "reporta": "EMP-1002",
        "cierre": (3, 4, "Se cambiaron los contenedores por unos con tapa y se aumentó la frecuencia de retiro.", "EMP-1000"),
    },
]


def instante_en_utc(dias_atras: int, hora: int, minuto: int) -> datetime:
    """Convierte un horario de planta (UTC-3) de hace N dias al instante UTC que guarda el backend."""
    ahora = datetime.now(timezone.utc)
    dia_local = ahora.astimezone(ZONA_PLANTA).date() - timedelta(days=dias_atras)
    instante = datetime.combine(dia_local, time(hora, minuto), tzinfo=ZONA_PLANTA).astimezone(timezone.utc)
    if instante > ahora:
        instante = ahora - timedelta(minutes=40)
    return instante


def generar_historial_checklists(db: Session) -> list:
    """Simula la ejecucion del plan con cumplimiento variable por sector, tarea, dia de la semana y tendencia."""
    azar = random.Random(2026)
    hoy = date.today()
    ahora_local = datetime.now()
    planes = db.query(Plan).all()

    checklists = []
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
                if azar.random() > probabilidad:
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
                    evidencia_url=None,
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
    """Carga incidentes de los cuatro tipos con sus cierres y reaperturas, respetando el orden de los movimientos."""
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


def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    
    try:
        print("Iniciando el poblamiento de la base de datos...")

        # --- UNIDADES DE MEDIDA ---
        if db.query(UnidadMedida).count() == 0:
            unidades = [
                UnidadMedida(nombre="Kilogramos"),
                UnidadMedida(nombre="Litros"),
                UnidadMedida(nombre="Gramos"),
                UnidadMedida(nombre="Unidades"),
                UnidadMedida(nombre="Mililitros"),
                UnidadMedida(nombre="Toneladas"),
                UnidadMedida(nombre="Cajas"),
                UnidadMedida(nombre="Paquetes"),
                UnidadMedida(nombre="Rollos"),
                UnidadMedida(nombre="Pallets")
            ]
            db.add_all(unidades)
            db.commit()
            print("Unidades de medida creadas (10).")

        # --- CAPACIDADES ---
        if db.query(Capacidad).count() == 0:
            # Solo Administrador y Operario
            capacidades = [
                Capacidad(nombre="Administrador"), 
                Capacidad(nombre="Operario")
            ]
            db.add_all(capacidades)
            db.commit()
            print("Capacidades creadas (2).")

        # --- INSUMOS ---
        if db.query(Insumo).count() == 0:
            u_kg = db.query(UnidadMedida).filter_by(nombre="Kilogramos").first().id
            u_l = db.query(UnidadMedida).filter_by(nombre="Litros").first().id
            u_u = db.query(UnidadMedida).filter_by(nombre="Unidades").first().id
            u_cj = db.query(UnidadMedida).filter_by(nombre="Cajas").first().id
            u_rl = db.query(UnidadMedida).filter_by(nombre="Rollos").first().id
            u_pq = db.query(UnidadMedida).filter_by(nombre="Paquetes").first().id
            
            insumos = [
                Insumo(nombre="Harina 000", unidad_medida_id=u_kg),
                Insumo(nombre="Azúcar Blanca", unidad_medida_id=u_kg),
                Insumo(nombre="Detergente Industrial", unidad_medida_id=u_l),
                Insumo(nombre="Lavandina Concentrada", unidad_medida_id=u_l),
                Insumo(nombre="Desengrasante", unidad_medida_id=u_l),
                Insumo(nombre="Cofias Descartables", unidad_medida_id=u_u),
                Insumo(nombre="Guantes de Nitrilo", unidad_medida_id=u_cj),
                Insumo(nombre="Levadura Fresca", unidad_medida_id=u_kg),
                Insumo(nombre="Sal Fina", unidad_medida_id=u_kg),
                Insumo(nombre="Aceite de Girasol", unidad_medida_id=u_l),
                Insumo(nombre="Alcohol al 70%", unidad_medida_id=u_l),
                Insumo(nombre="Papel Film", unidad_medida_id=u_rl),
                Insumo(nombre="Etiquetas Adhesivas", unidad_medida_id=u_rl),
                Insumo(nombre="Cajas de Cartón Corrugado", unidad_medida_id=u_cj),
                Insumo(nombre="Bolsas de Consorcio", unidad_medida_id=u_pq),
                Insumo(nombre="Esponjas Metálicas", unidad_medida_id=u_u)
            ]
            db.add_all(insumos)
            db.commit()
            print("Insumos creados (16).")

        # --- EMPLEADOS ---
        if db.query(Empleado).count() == 0:
            c_admin = db.query(Capacidad).filter_by(nombre="Administrador").first()
            c_operario = db.query(Capacidad).filter_by(nombre="Operario").first()

            # Se les asigna explícitamente el rol además de la capacidad
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

            # Los primeros dos son admins
            if c_admin: 
                empleados[0].capacidades.append(c_admin)
                empleados[1].capacidades.append(c_admin)
            
            # El resto son operarios
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

            equipos = [
                Equipo(nombre="Heladera Cámara 1", activo=True, tipo_id=t_heladera, sector_id=s_frio),
                Equipo(nombre="Horno Rotativo", activo=True, tipo_id=t_horno, sector_id=s_coccion),
                Equipo(nombre="Balanza Digital 30kg", activo=True, tipo_id=t_balanza, sector_id=s_recepcion, frecuencia_mantenimiento_dias=180, fecha_ultimo_mantenimiento=date.today() - timedelta(days=200)),
                Equipo(nombre="Amasadora Industrial 50kg", activo=True, tipo_id=t_amasadora, sector_id=s_preparacion),
                Equipo(nombre="Termómetro Infrarrojo", activo=True, tipo_id=t_termometro, sector_id=s_calidad, frecuencia_mantenimiento_dias=90, fecha_ultimo_mantenimiento=date.today() - timedelta(days=85)),
                Equipo(nombre="Termómetro de Pinche", activo=True, tipo_id=t_termometro, sector_id=s_coccion),
                Equipo(nombre="Cámara de Congelados", activo=True, tipo_id=t_heladera, sector_id=s_frio),
                Equipo(nombre="Cortadora de Fiambre", activo=False, estado="danado", tipo_id=t_cortadora, sector_id=s_mantenimiento),
                Equipo(nombre="Envasadora al Vacío", activo=True, tipo_id=t_envasadora, sector_id=s_empaque),
                Equipo(nombre="Mezcladora de Polvos 100L", activo=True, tipo_id=t_mezcladora, sector_id=s_preparacion),
                Equipo(nombre="Balanza de Precisión", activo=True, tipo_id=t_balanza, sector_id=s_laboratorio, frecuencia_mantenimiento_dias=365, fecha_ultimo_mantenimiento=date.today() - timedelta(days=30)),
                Equipo(nombre="Cinta Transportadora Ppal", activo=True, tipo_id=t_cinta, sector_id=s_produccion),
                Equipo(nombre="Detector de Metales Fin de Línea", activo=True, tipo_id=t_detector, sector_id=s_empaque, frecuencia_mantenimiento_dias=120, fecha_ultimo_mantenimiento=date.today() - timedelta(days=118)),
                Equipo(nombre="Horno Convector Secundario", activo=False, estado="danado", tipo_id=t_horno, sector_id=s_mantenimiento)
            ]
            db.add_all(equipos)
            db.commit()
            print("Equipos creados (14).")

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
            ]
            db.add_all(productos_limpieza)
            db.commit()
            print(f"Productos de Limpieza creados ({len(productos_limpieza)}).")

        if db.query(Tarea).count() == 0:
            productos = {p.nombre: p.id for p in db.query(ProductoLimpieza).all()}

            for titulo, frecuencia, consumos in DATOS_TAREAS:
                tarea = Tarea(titulo=titulo, frecuencia=frecuencia)
                tarea.consumos_estimados = [
                    ConsumoEstimado(producto_limpieza_id=productos[producto], cantidad=cantidad)
                    for producto, cantidad in consumos
                ]
                db.add(tarea)
            db.commit()
            print(f"Tareas y Consumos Estimados creados ({len(DATOS_TAREAS)} tareas).")

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
                    equipos=[equipos[nombre] for nombre in nombres_equipos],
                    tareas=[tareas[nombre] for nombre in nombres_tareas],
                )
                for titulo, sector, dias_desde_inicio, nombres_equipos, nombres_tareas in DATOS_PLANES
            ]
            db.add_all(planes)
            db.commit()
            print(f"Planes de Limpieza creados ({len(planes)}).")

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

        # --- CHECKLISTS (HISTORIAL DE EJECUCIONES HASTA EL PRIMERO DEL MES Y DÍAS PREVIOS) ---
        if db.query(Checklist).count() == 0:
            checklists_seed = generar_historial_checklists(db)
            db.add_all(checklists_seed)
            db.commit()
            print(f"Historial de Checklists creado ({len(checklists_seed)} ejecuciones en {DIAS_DE_HISTORIAL} días).")

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

        if db.query(Documentacion).count() == 0:
            hoy_doc = date.today()
            empleados_doc = {e.legajo: e for e in db.query(Empleado).all()}

            libretas = [
                LibretaSanitaria(
                    empleado_id=empleados_doc[legajo].id,
                    numero_carnet=f"LS-{1000 + indice}",
                    autoridad_emisora="Municipalidad de Trelew",
                    fecha_vencimiento=hoy_doc + timedelta(days=dias),
                )
                for indice, (legajo, dias) in enumerate(DATOS_LIBRETAS)
            ]
            capacitaciones = [
                Capacitacion(
                    empleado_id=empleados_doc[legajo].id,
                    titulo=titulo,
                    observaciones=observaciones,
                    fecha_vencimiento=hoy_doc + timedelta(days=dias),
                )
                for legajo, titulo, dias, observaciones in DATOS_CAPACITACIONES
            ]
            certificados = [
                CertificadoAptitudFisica(
                    empleado_id=empleados_doc[legajo].id,
                    nombre_medico=medico,
                    matricula=matricula,
                    fecha_vencimiento=hoy_doc + timedelta(days=dias),
                )
                for legajo, medico, matricula, dias in DATOS_CERTIFICADOS
            ]
            db.add_all(libretas + capacitaciones + certificados)
            db.commit()
            print(
                f"Documentación creada ({len(libretas)} libretas, "
                f"{len(capacitaciones)} capacitaciones, {len(certificados)} certificados)."
            )

        if db.query(Incidente).count() == 0:
            cantidad_incidentes, cantidad_movimientos = generar_incidentes(db)
            print(f"Incidentes creados ({cantidad_incidentes}, con {cantidad_movimientos} cierres y reaperturas).")


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
            db.add_all([doc_bpm, doc_poes, doc_ficha])
            db.commit()
            db.refresh(doc_bpm)
            db.refresh(doc_poes)
            db.refresh(doc_ficha)
            pdf_base = "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iag=="
            hoy_d = date.today()
            # Doc BPM con 2 versiones para probar historial
            db.execute(
                insert(version_documento).values([
                    {
                        "documentos_versionados_id": doc_bpm.id,
                        "version": 1,
                        "estado": EstadoVersionDocumento.ARCHIVADO,
                        "version_documento_url": pdf_base,
                        "fecha_vigencia": hoy_d - timedelta(days=60),
                        "fecha_subida": datetime.now() - timedelta(days=60),
                        "subido_por_id": admin_id,
                        "archivo_nombre": "manual_bpm_v1.pdf",
                    },
                    {
                        "documentos_versionados_id": doc_bpm.id,
                        "version": 2,
                        "estado": EstadoVersionDocumento.ACTIVO,
                        "version_documento_url": pdf_base,
                        "fecha_vigencia": (datetime.now() - timedelta(hours=6)).date(),
                        "fecha_subida": datetime.now() - timedelta(hours=6),
                        "subido_por_id": admin_id,
                        "archivo_nombre": "manual_bpm_v2.pdf",
                    },
                    {
                        "documentos_versionados_id": doc_poes.id,
                        "version": 1,
                        "estado": EstadoVersionDocumento.ACTIVO,
                        "version_documento_url": pdf_base,
                        "fecha_vigencia": hoy_d - timedelta(days=15),
                        "fecha_subida": datetime.now() - timedelta(days=15),
                        "subido_por_id": admin_id,
                        "archivo_nombre": "poes_sanitizacion_v1.pdf",
                    },
                    {
                        "documentos_versionados_id": doc_ficha.id,
                        "version": 1,
                        "estado": EstadoVersionDocumento.ACTIVO,
                        "version_documento_url": pdf_base,
                        "fecha_vigencia": hoy_d - timedelta(days=4),
                        "fecha_subida": datetime.now() - timedelta(days=4, hours=6),
                        "subido_por_id": admin_id,
                        "archivo_nombre": "ficha_harina_000.pdf",
                    },
                ])
            )
            db.commit()
            print("Documentos Versionados y Versiones Históricas creados (3 documentos, 4 versiones).")


        print("Base de datos poblada exitosamente con datos de prueba para Inocuidad Alimentaria!")

    except Exception as e:
        db.rollback()
        print(f"Error al poblar la base de datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()