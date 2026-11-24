import random
import uuid
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
from src.vista_publica.models import ConfiguracionVistaPublica
from src.asociaciones.lote_insumos import lote_insumo
from pathlib import Path
from src.unidades_medida import services as unidades_medida_services
from src.alimentos_referencia.models import AlimentoReferencia
from src.alimentos_referencia import services as alimentos_referencia_services
from src.datos_nutricionales import services as datos_nutricionales_services
from src.datos_nutricionales.constants import FuenteDatoNutricional, Nutriente
from src.datos_nutricionales.schemas import CargaDatosNutricionales
from src.parametros_normativos.models import ConjuntoParametros, ModuloRotuladoFrontal
from src.parametros_normativos import services as parametros_normativos_services
from src.rotulado_frontal.models import EvaluacionAplicabilidad, CalculoSellosRotulado
from src.rotulado_frontal import services as rotulado_frontal_services
from src.rotulado_frontal.schemas import ActualizacionMarcasInsumos, CambioMarcaInsumo, NuevaEvaluacion
from src.alergenos.models import DeclaracionAlergenos
from src.alergenos import schemas as alergenos_schemas
from src.alergenos import services as alergenos_services
from src.rotulados.models import Rotulo
from src.rotulados import schemas as rotulados_schemas
from src.rotulados import services as rotulados_services

from src.configuracion_empresa.models import ConfiguracionEmpresa
from src.aditivos.models import Aditivo, ClaseFuncionalAditivo
from src.recetas.models import Receta, VersionReceta, PasoReceta, DetalleReceta
from src.recetas.constants import EstadoVersionReceta, TipoUsoInsumo
from src.asociaciones.detalle_receta import detalle_receta

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


DENSIDADES_INSUMOS = {
    "Leche Entera": 1.03,
    "Aceite de Girasol": 0.92,
}


def crear_insumos(db: Session) -> int:
    """Crea los insumos alimentarios con su stock, que se guarda en gramos o mililitros.

    Los liquidos que se usan en las recetas de ejemplo llevan su densidad, para pasar mililitros a gramos.
    """
    for nombre, nombre_unidad, stock in INSUMOS_ALIMENTARIOS:
        unidad = db.query(UnidadMedida).filter_by(nombre=nombre_unidad).first()
        db.add(Insumo(
            nombre=nombre,
            unidad_medida_id=unidad.id,
            cantidad=unidades_medida_services.convertir_a_base(stock, unidad),
            densidad_g_ml=DENSIDADES_INSUMOS.get(nombre),
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
    (
        "Manteca",
        "Tabla de Composición ARGENFOODS / USDA",
        {
            Nutriente.ENERGIA: 717,
            Nutriente.CARBOHIDRATOS: 0.06,
            Nutriente.AZUCARES_TOTALES: 0.06,
            Nutriente.AZUCARES_ANADIDOS: 0,
            Nutriente.PROTEINAS: 0.85,
            Nutriente.GRASAS_TOTALES: 81.1,
            Nutriente.GRASAS_SATURADAS: 51.4,
            Nutriente.GRASAS_TRANS: 2.5,
            Nutriente.FIBRA_ALIMENTARIA: 0,
            Nutriente.SODIO: 11,
        },
    ),
    (
        "Aceite de Girasol",
        "Tabla de Composición ARGENFOODS",
        {
            Nutriente.ENERGIA: 884,
            Nutriente.CARBOHIDRATOS: 0,
            Nutriente.AZUCARES_TOTALES: 0,
            Nutriente.AZUCARES_ANADIDOS: 0,
            Nutriente.PROTEINAS: 0,
            Nutriente.GRASAS_TOTALES: 100.0,
            Nutriente.GRASAS_SATURADAS: 11.0,
            Nutriente.GRASAS_TRANS: 0,
            Nutriente.FIBRA_ALIMENTARIA: 0,
            Nutriente.SODIO: 0,
        },
    ),
    (
        "Polvo de Hornear",
        "ANMAT / Bibliografía de Referencia",
        {
            Nutriente.ENERGIA: 53,
            Nutriente.CARBOHIDRATOS: 27.7,
            Nutriente.AZUCARES_TOTALES: 0,
            Nutriente.AZUCARES_ANADIDOS: 0,
            Nutriente.PROTEINAS: 0,
            Nutriente.GRASAS_TOTALES: 0,
            Nutriente.GRASAS_SATURADAS: 0,
            Nutriente.GRASAS_TRANS: 0,
            Nutriente.FIBRA_ALIMENTARIA: 0,
            Nutriente.SODIO: 10600,
        },
    ),
    (
        "Bicarbonato de Sodio",
        "ANMAT / Bibliografía de Referencia",
        {
            Nutriente.ENERGIA: 0,
            Nutriente.CARBOHIDRATOS: 0,
            Nutriente.AZUCARES_TOTALES: 0,
            Nutriente.AZUCARES_ANADIDOS: 0,
            Nutriente.PROTEINAS: 0,
            Nutriente.GRASAS_TOTALES: 0,
            Nutriente.GRASAS_SATURADAS: 0,
            Nutriente.GRASAS_TRANS: 0,
            Nutriente.FIBRA_ALIMENTARIA: 0,
            Nutriente.SODIO: 27360,
        },
    ),
    (
        "Esencia de Vainilla",
        "Bibliografía de Referencia",
        {
            Nutriente.ENERGIA: 288,
            Nutriente.CARBOHIDRATOS: 12.6,
            Nutriente.AZUCARES_TOTALES: 12.6,
            Nutriente.AZUCARES_ANADIDOS: 12.6,
            Nutriente.PROTEINAS: 0,
            Nutriente.GRASAS_TOTALES: 0,
            Nutriente.GRASAS_SATURADAS: 0,
            Nutriente.GRASAS_TRANS: 0,
            Nutriente.FIBRA_ALIMENTARIA: 0,
            Nutriente.SODIO: 9,
        },
    ),
]


def cargar_datos_nutricionales_de_ejemplo(db: Session) -> int:
    """Importa la base SARA (CSV mas el complemento de SARA 2) y carga datos de algunos insumos.

    De cada alimento se cargan los nutrientes que SARA informa.
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
        {"nutriente": Nutriente.SODIO, "valor": 2.0, "fuente": FuenteDatoNutricional.SARA, "alimento_codigo": "A033"},
        {"nutriente": Nutriente.AZUCARES_TOTALES, "valor": 0.4, "fuente": FuenteDatoNutricional.BIBLIOGRAFIA, "referencia": "SARA"},
        {"nutriente": Nutriente.AZUCARES_ANADIDOS, "valor": 0.0, "fuente": FuenteDatoNutricional.BIBLIOGRAFIA, "referencia": "SARA"},
        {"nutriente": Nutriente.GRASAS_TRANS, "valor": 0.0, "fuente": FuenteDatoNutricional.BIBLIOGRAFIA, "referencia": "SARA"},
    ])
    return cargados


def crear_vista_publica_de_ejemplo(db: Session) -> None:
    """Deja un QR activo con la presentacion del establecimiento, listo para mostrar en la demo."""
    db.add(ConfiguracionVistaPublica(
        nombre="Local Centro",
        activa=True,
        fecha_activacion=datetime.now(timezone.utc),
        token=uuid.uuid4().hex,
        mostrar_cumplimiento_limpieza=True,
        mostrar_equipos_calibrados=True,
        mostrar_capacitaciones=True,
        mostrar_poes_vigentes=False,
        mostrar_trazabilidad_lotes=True,
        titulo_publico="Panadería La Espiga",
        presentacion=(
            "Elaboramos pan, facturas y pastelería todos los días con materias primas seleccionadas.\n"
            "Trabajamos con buenas prácticas de manufactura y controles de higiene diarios."
        ),
        contacto="Av. Fontana 123, Trelew · Lunes a sábado de 7 a 20 h",
    ))
    db.commit()


EVALUACIONES_ROTULADO_FRONTAL = [
    ("Pan francés", 20, {"envasado_en_ausencia_del_cliente": False}),
    ("Pan lactal", 20, {"envasado_en_ausencia_del_cliente": True, "agrega_azucares": True, "agrega_grasas": True}),
    (
        "Pan lactal",
        6,
        {"envasado_en_ausencia_del_cliente": True, "agrega_azucares": True, "agrega_grasas": True, "agrega_sodio": True},
    ),
    ("Prepizza", 12, {"envasado_en_ausencia_del_cliente": True, "agrega_grasas": True, "agrega_sodio": True}),
    ("Jugo de naranja exprimido", 9, {"envasado_en_ausencia_del_cliente": True}),
]


MARCAS_ROTULADO_INSUMOS = {
    "Azúcar Blanca": {"agrega_azucares": True},
    "Azúcar Morena": {"agrega_azucares": True},
    "Miel": {"agrega_azucares": True},
    "Sal Fina": {"agrega_sodio": True},
    "Manteca": {"agrega_grasas": True},
    "Margarina": {"agrega_grasas": True},
    "Grasa Vacuna": {"agrega_grasas": True},
    "Aceite de Girasol": {"agrega_grasas": True},
    "Aceite de Oliva": {"agrega_grasas": True},
    "Harina 000": {},
    "Levadura Fresca": {},
    "Leche Entera": {},
    "Naranjas": {},
}


def cargar_rotulado_frontal_de_ejemplo(db: Session) -> int:
    """Publica la version inicial de los parametros normativos y deja algunos productos ya evaluados.

    El pan lactal tiene dos evaluaciones: la primera omitio la sal y se corrigio despues, para ver el historial.
    Medialunas y galletitas quedan sin evaluar. Los insumos basicos quedan con sus marcas revisadas.
    """
    admin = db.query(Empleado).filter_by(legajo="EMP-1000").first()
    parametros_normativos_services.importar_archivo(db, empleado_id=admin.id)
    parametros_normativos_services.leer_modulo(db)
    rotulado_frontal_services.actualizar_marcas_insumos(
        db,
        ActualizacionMarcasInsumos(
            empleado_id=admin.id,
            marcas=[
                CambioMarcaInsumo(insumo_id=db.query(Insumo).filter_by(nombre=nombre).first().id, **marcas)
                for nombre, marcas in MARCAS_ROTULADO_INSUMOS.items()
            ],
        ),
    )
    for nombre, dias_atras, respuestas in EVALUACIONES_ROTULADO_FRONTAL:
        producto = db.query(Producto).filter_by(nombre=nombre).first()
        evaluacion = rotulado_frontal_services.evaluar(
            db, producto.id, NuevaEvaluacion(empleado_id=admin.id, **respuestas)
        )
        db.get(EvaluacionAplicabilidad, evaluacion.id).fecha = datetime.now() - timedelta(days=dias_atras, hours=3)
    db.commit()
    return len(EVALUACIONES_ROTULADO_FRONTAL)


def cargar_aditivos_y_recetas_de_ejemplo(db: Session, unidad_gramos: UnidadMedida) -> tuple[int, int]:
    """Pobla el maestro de aditivos INS, vincula insumos aditivos y crea recetas completas para los productos."""
    unidad_ml = db.query(UnidadMedida).filter(UnidadMedida.nombre == "Mililitros").one()
    cf_map = {}
    clases_datos = [
        ("Conservante", True),
        ("Antioxidante", True),
        ("Colorante", True),
        ("Aromatizante / Saborizante", False),
        ("Emulsionante / Emulgente", True),
        ("Estabilizante / Espesante", True),
        ("Leudante Químico", True),
        ("Acidulante", True),
        ("Edulcorante", True),
    ]
    for nombre, necesita_ins in clases_datos:
        cf = db.query(ClaseFuncionalAditivo).filter_by(nombre=nombre).first()
        if not cf:
            cf = ClaseFuncionalAditivo(nombre=nombre, necesita_ins=necesita_ins)
            db.add(cf)
            db.flush()
        cf_map[nombre] = cf.id

    aditivos_datos = [
        ("Benzoato de Sodio", "Conservante", "211"),
        ("Sorbato de Potasio", "Conservante", "202"),
        ("Propionato de Calcio", "Conservante", "282"),
        ("Ácido Ascórbico (Vitamina C)", "Antioxidante", "300"),
        ("Alfa-Tocoferol (Vitamina E)", "Antioxidante", "307"),
        ("Lecitina de Soya", "Emulsionante / Emulgente", "322"),
        ("Bicarbonato de Sodio", "Leudante Químico", "500ii"),
        ("Ácido Cítrico", "Acidulante", "330"),
        ("Aroma Natural de Vainilla", "Aromatizante / Saborizante", None),
        ("Aroma a Manteca", "Aromatizante / Saborizante", None),
    ]
    ad_map = {}
    for nombre_comp, cf_nombre, ins in aditivos_datos:
        ad = db.query(Aditivo).filter_by(nombre_completo=nombre_comp).first()
        if not ad:
            ad = Aditivo(
                nombre_completo=nombre_comp,
                clase_funcional_id=cf_map[cf_nombre],
                numero_ins=ins
            )
            db.add(ad)
            db.flush()
        ad_map[nombre_comp] = ad

    vincular_insumos = [
        ("Bicarbonato de Sodio", "Bicarbonato de Sodio"),
        ("Polvo de Hornear", "Bicarbonato de Sodio"),
        ("Esencia de Vainilla", "Aroma Natural de Vainilla"),
    ]
    for ins_nombre, ad_nombre in vincular_insumos:
        ins = db.query(Insumo).filter_by(nombre=ins_nombre).first()
        if ins and ad_nombre in ad_map:
            ins.es_aditivo = True
            ins.aditivo_referencia_id = ad_map[ad_nombre].id
    db.commit()

    productos = {p.nombre: p for p in db.query(Producto).all()}
    insumos = {i.nombre: i for i in db.query(Insumo).all()}
    equipos = {e.nombre: e for e in db.query(Equipo).all()}

    recetas_creadas = 0

    if "Pan francés" in productos and "Harina 000" in insumos and "Sal Fina" in insumos:
        prod_pan = productos["Pan francés"]
        rec_pan = db.query(Receta).filter_by(producto_id=prod_pan.id).first()
        if not rec_pan:
            rec_pan = Receta(producto_id=prod_pan.id)
            db.add(rec_pan)
            db.flush()

            v1 = VersionReceta(
                receta_id=rec_pan.id,
                version=1,
                rendimiento_final_gramos=1000.0,
                unidad_venta_gramos=250.0,
                medida_casera="1 porción (250g)",
                motivo_cambio="Fórmula original de pan baguette tradicional",
                estado=EstadoVersionReceta.ARCHIVADO,
                fecha_vigencia=date.today() - timedelta(days=60)
            )
            db.add(v1)
            db.flush()

            db.execute(insert(detalle_receta).values([
                {"receta_id": rec_pan.id, "nro_version": 1, "renglon": 1, "insumo_id": insumos["Harina 000"].id, "cantidad_original": 650.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 650.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_pan.id, "nro_version": 1, "renglon": 2, "insumo_id": insumos["Levadura Fresca"].id, "cantidad_original": 20.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 20.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_pan.id, "nro_version": 1, "renglon": 3, "insumo_id": insumos["Sal Fina"].id, "cantidad_original": 12.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 12.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
            ]))

            v2 = VersionReceta(
                receta_id=rec_pan.id,
                version=2,
                rendimiento_final_gramos=1000.0,
                unidad_venta_gramos=250.0,
                medida_casera="1 porción (250g)",
                motivo_cambio="Incorporación de conservante INS 282 y optimización de fermentación",
                estado=EstadoVersionReceta.ACTIVO,
                fecha_vigencia=date.today() - timedelta(days=10)
            )
            db.add(v2)
            db.flush()

            db.execute(insert(detalle_receta).values([
                {"receta_id": rec_pan.id, "nro_version": 2, "renglon": 1, "insumo_id": insumos["Harina 000"].id, "cantidad_original": 650.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 650.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_pan.id, "nro_version": 2, "renglon": 2, "insumo_id": insumos["Levadura Fresca"].id, "cantidad_original": 15.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 15.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_pan.id, "nro_version": 2, "renglon": 3, "insumo_id": insumos["Sal Fina"].id, "cantidad_original": 12.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 12.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
            ]))

            horno = equipos.get("Horno Rotativo")
            amasadora = equipos.get("Amasadora Industrial 50kg")

            paso1 = PasoReceta(
                receta_id=rec_pan.id, version=2, orden=1,
                nombre_paso="Amasado y Homogeneización",
                procedimiento="Mezclar Harina 000, agua, levadura y sal fina en amasadora hasta lograr velo de masa.",
                equipo_id=amasadora.id if amasadora else None, tiempo_minutos=18, temperatura_celsius=24.0, es_punto_control=False
            )
            paso2 = PasoReceta(
                receta_id=rec_pan.id, version=2, orden=2,
                nombre_paso="Fermentación en Cámara",
                procedimiento="Repasar bollos y dejar leudar en cámara climatizada a 28°C con 75% humedad.",
                equipo_id=None, tiempo_minutos=45, temperatura_celsius=28.0, es_punto_control=True
            )
            paso3 = PasoReceta(
                receta_id=rec_pan.id, version=2, orden=3,
                nombre_paso="Horneado con Inyección de Vapor",
                procedimiento="Realizar cortes en corteza y hornear a 220°C con vapor inicial de 10 segundos.",
                equipo_id=horno.id if horno else None, tiempo_minutos=22, temperatura_celsius=220.0, es_punto_control=True
            )
            db.add_all([paso1, paso2, paso3])
            recetas_creadas += 1

    if "Medialunas de manteca" in productos and "Harina 000" in insumos and "Manteca" in insumos:
        prod_m = productos["Medialunas de manteca"]
        rec_m = db.query(Receta).filter_by(producto_id=prod_m.id).first()
        if not rec_m:
            rec_m = Receta(producto_id=prod_m.id)
            db.add(rec_m)
            db.flush()

            v_m = VersionReceta(
                receta_id=rec_m.id, version=1,
                rendimiento_final_gramos=500.0, rendimiento_unidades=10, unidad_venta_gramos=50.0,
                medida_casera="1 unidad (50g)", motivo_cambio="Fórmula artesanal de hojaldre",
                estado=EstadoVersionReceta.ACTIVO, fecha_vigencia=date.today() - timedelta(days=20)
            )
            db.add(v_m)
            db.flush()

            db.execute(insert(detalle_receta).values([
                {"receta_id": rec_m.id, "nro_version": 1, "renglon": 1, "insumo_id": insumos["Harina 000"].id, "cantidad_original": 300.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 300.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_m.id, "nro_version": 1, "renglon": 2, "insumo_id": insumos["Manteca"].id, "cantidad_original": 100.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 100.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_m.id, "nro_version": 1, "renglon": 3, "insumo_id": insumos["Azúcar Blanca"].id, "cantidad_original": 60.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 60.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_m.id, "nro_version": 1, "renglon": 4, "insumo_id": insumos["Leche Entera"].id, "cantidad_original": 80.0, "unidad_medida_id": unidad_ml.id, "cantidad_gramos": round(80.0 * DENSIDADES_INSUMOS["Leche Entera"], 2), "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
            ]))

            p_m1 = PasoReceta(
                receta_id=rec_m.id, version=1, orden=1,
                nombre_paso="Amasado y Laminado de Hojaldre",
                procedimiento="Amasar ingredientes base, enfriar la masa y laminar realizando 3 vueltas simples con el bloque de manteca.",
                equipo_id=None, tiempo_minutos=40, temperatura_celsius=18.0, es_punto_control=False
            )
            p_m2 = PasoReceta(
                receta_id=rec_m.id, version=1, orden=2,
                nombre_paso="Horneado y Almibarado",
                procedimiento="Hornear a 200°C hasta dorado uniforme y pincelar con almíbar caliente al retirar.",
                equipo_id=equipos.get("Horno Rotativo").id if "Horno Rotativo" in equipos else None, tiempo_minutos=16, temperatura_celsius=200.0, es_punto_control=True
            )
            db.add_all([p_m1, p_m2])
            recetas_creadas += 1

    if "Prepizza" in productos and "Harina 000" in insumos and "Puré de Tomate" in insumos:
        prod_p = productos["Prepizza"]
        rec_p = db.query(Receta).filter_by(producto_id=prod_p.id).first()
        if not rec_p:
            rec_p = Receta(producto_id=prod_p.id)
            db.add(rec_p)
            db.flush()

            v_p = VersionReceta(
                receta_id=rec_p.id, version=1,
                rendimiento_final_gramos=300.0, rendimiento_unidades=1, unidad_venta_gramos=300.0,
                medida_casera="1 prepizza (300g)", motivo_cambio="Estándar de masa de pizza para envasado",
                estado=EstadoVersionReceta.ACTIVO, fecha_vigencia=date.today() - timedelta(days=15)
            )
            db.add(v_p)
            db.flush()

            db.execute(insert(detalle_receta).values([
                {"receta_id": rec_p.id, "nro_version": 1, "renglon": 1, "insumo_id": insumos["Harina 000"].id, "cantidad_original": 160.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 160.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_p.id, "nro_version": 1, "renglon": 2, "insumo_id": insumos["Puré de Tomate"].id, "cantidad_original": 50.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 50.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_p.id, "nro_version": 1, "renglon": 3, "insumo_id": insumos["Aceite de Girasol"].id, "cantidad_original": 10.0, "unidad_medida_id": unidad_ml.id, "cantidad_gramos": round(10.0 * DENSIDADES_INSUMOS["Aceite de Girasol"], 2), "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
            ]))

            p_p1 = PasoReceta(
                receta_id=rec_p.id, version=1, orden=1,
                nombre_paso="Precocción de Disco de Pizza",
                procedimiento="Estirar masa en molde, aplicar cobertura de salsa de tomate e ingresar a horno a 240°C.",
                equipo_id=equipos.get("Horno Rotativo").id if "Horno Rotativo" in equipos else None, tiempo_minutos=8, temperatura_celsius=240.0, es_punto_control=True
            )
            db.add(p_p1)
            recetas_creadas += 1

    if "Pan lactal" in productos and "Harina 000" in insumos:
        prod_pl = productos["Pan lactal"]
        rec_pl = db.query(Receta).filter_by(producto_id=prod_pl.id).first()
        if not rec_pl:
            rec_pl = Receta(producto_id=prod_pl.id)
            db.add(rec_pl)
            db.flush()

            v_pl = VersionReceta(
                receta_id=rec_pl.id, version=1,
                rendimiento_final_gramos=600.0, rendimiento_unidades=1, unidad_venta_gramos=50.0,
                medida_casera="2 rodajas (50g)", motivo_cambio="Creación de fórmula estándar de Pan Lactal",
                estado=EstadoVersionReceta.ACTIVO, fecha_vigencia=date.today() - timedelta(days=25)
            )
            db.add(v_pl)
            db.flush()

            db.execute(insert(detalle_receta).values([
                {"receta_id": rec_pl.id, "nro_version": 1, "renglon": 1, "insumo_id": insumos["Harina 000"].id, "cantidad_original": 350.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 350.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_pl.id, "nro_version": 1, "renglon": 2, "insumo_id": insumos["Leche Entera"].id, "cantidad_original": 100.0, "unidad_medida_id": unidad_ml.id, "cantidad_gramos": round(100.0 * DENSIDADES_INSUMOS["Leche Entera"], 2), "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_pl.id, "nro_version": 1, "renglon": 3, "insumo_id": insumos["Manteca"].id, "cantidad_original": 30.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 30.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_pl.id, "nro_version": 1, "renglon": 4, "insumo_id": insumos["Azúcar Blanca"].id, "cantidad_original": 20.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 20.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_pl.id, "nro_version": 1, "renglon": 5, "insumo_id": insumos["Sal Fina"].id, "cantidad_original": 8.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 8.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_pl.id, "nro_version": 1, "renglon": 6, "insumo_id": insumos["Levadura Fresca"].id, "cantidad_original": 15.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 15.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
            ]))

            p_pl1 = PasoReceta(
                receta_id=rec_pl.id, version=1, orden=1,
                nombre_paso="Amasado y Leudado en Molde",
                procedimiento="Mezclar harina, leche, manteca, azúcar, sal y levadura. Amasar hasta desarrollar red de gluten, colocar en molde y leudar a 30°C.",
                equipo_id=equipos.get("Amasadora Industrial").id if "Amasadora Industrial" in equipos else None, tiempo_minutos=30, temperatura_celsius=30.0, es_punto_control=False
            )
            p_pl2 = PasoReceta(
                receta_id=rec_pl.id, version=1, orden=2,
                nombre_paso="Horneado",
                procedimiento="Hornear a 180°C durante 35 minutos hasta lograr corteza dorada y miga uniforme.",
                equipo_id=equipos.get("Horno Rotativo").id if "Horno Rotativo" in equipos else None, tiempo_minutos=35, temperatura_celsius=180.0, es_punto_control=True
            )
            db.add_all([p_pl1, p_pl2])
            recetas_creadas += 1

    if "Galletitas de agua" in productos and "Harina 000" in insumos:
        prod_g = productos["Galletitas de agua"]
        rec_g = db.query(Receta).filter_by(producto_id=prod_g.id).first()
        if not rec_g:
            rec_g = Receta(producto_id=prod_g.id)
            db.add(rec_g)
            db.flush()

            v_g = VersionReceta(
                receta_id=rec_g.id, version=1,
                rendimiento_final_gramos=500.0, rendimiento_unidades=4, unidad_venta_gramos=30.0,
                medida_casera="6 galletitas (30g)", motivo_cambio="Fórmula tradicional de galletitas de agua",
                estado=EstadoVersionReceta.ACTIVO, fecha_vigencia=date.today() - timedelta(days=10)
            )
            db.add(v_g)
            db.flush()

            db.execute(insert(detalle_receta).values([
                {"receta_id": rec_g.id, "nro_version": 1, "renglon": 1, "insumo_id": insumos["Harina 000"].id, "cantidad_original": 400.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 400.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_g.id, "nro_version": 1, "renglon": 2, "insumo_id": insumos["Aceite de Girasol"].id, "cantidad_original": 50.0, "unidad_medida_id": unidad_ml.id, "cantidad_gramos": round(50.0 * DENSIDADES_INSUMOS["Aceite de Girasol"], 2), "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_g.id, "nro_version": 1, "renglon": 3, "insumo_id": insumos["Sal Fina"].id, "cantidad_original": 12.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 12.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
                {"receta_id": rec_g.id, "nro_version": 1, "renglon": 4, "insumo_id": insumos["Levadura Fresca"].id, "cantidad_original": 10.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 10.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
            ]))

            p_g1 = PasoReceta(
                receta_id=rec_g.id, version=1, orden=1,
                nombre_paso="Laminado, Estampado y Horneado",
                procedimiento="Amasar, estirar masa fina, estampar formas de galletita y hornear a 210°C hasta sequedad y textura crocante.",
                equipo_id=equipos.get("Horno Rotativo").id if "Horno Rotativo" in equipos else None, tiempo_minutos=12, temperatura_celsius=210.0, es_punto_control=True
            )
            db.add(p_g1)
            recetas_creadas += 1

    if "Jugo de naranja exprimido" in productos and "Naranjas" in insumos:
        prod_j = productos["Jugo de naranja exprimido"]
        rec_j = db.query(Receta).filter_by(producto_id=prod_j.id).first()
        if not rec_j:
            rec_j = Receta(producto_id=prod_j.id)
            db.add(rec_j)
            db.flush()

            v_j = VersionReceta(
                receta_id=rec_j.id, version=1,
                rendimiento_final_gramos=500.0, unidad_venta_gramos=200.0,
                medida_casera="1 vaso (200ml)", motivo_cambio="Extracción 100% natural de naranja",
                estado=EstadoVersionReceta.ACTIVO, fecha_vigencia=date.today() - timedelta(days=5)
            )
            db.add(v_j)
            db.flush()

            db.execute(insert(detalle_receta).values([
                {"receta_id": rec_j.id, "nro_version": 1, "renglon": 1, "insumo_id": insumos["Naranjas"].id, "cantidad_original": 1000.0, "unidad_medida_id": unidad_gramos.id, "cantidad_gramos": 1000.0, "tipo_uso": TipoUsoInsumo.INGREDIENTE.value, "aditivo_id": None},
            ]))

            p_j1 = PasoReceta(
                receta_id=rec_j.id, version=1, orden=1,
                nombre_paso="Exprimido y Filtrado",
                procedimiento="Lavar fruta fresca, exprimir cítricos, filtrar pulpa y envasar en frío a 4°C.",
                equipo_id=None, tiempo_minutos=15, temperatura_celsius=4.0, es_punto_control=True
            )
            db.add(p_j1)
            recetas_creadas += 1

    db.commit()
    return len(ad_map), recetas_creadas


MARCAS_ALERGENOS_INSUMOS = {
    "Harina 000": (["trigo"], True),
    "Harina Integral": (["trigo"], True),
    "Avena Arrollada": (["avena"], True),
    "Leche Entera": (["leche"], False),
    "Manteca": (["leche"], False),
    "Dulce de Leche": (["leche"], False),
    "Crema de Leche": (["leche"], False),
    "Queso Crema": (["leche"], False),
    "Ricota": (["leche"], False),
    "Queso Muzzarella": (["leche"], False),
    "Huevo Entero": (["huevo"], False),
    "Yema de Huevo": (["huevo"], False),
    "Clara de Huevo": (["huevo"], False),
    "Nueces": (["frutas_secas"], False),
    "Almendras": (["frutas_secas"], False),
    "Azúcar Blanca": ([], False),
    "Sal Fina": ([], False),
    "Levadura Fresca": ([], False),
    "Aceite de Girasol": ([], False),
    "Naranjas": ([], False),
    "Harina de Arroz": ([], False),
    "Almidón de Maíz": ([], False),
    "Miel": ([], False),
    "Tomate Fresco": ([], False),
}

CONSERVACION_PRODUCTOS = {
    "Pan francés": {"duracion": 2, "instrucciones": "Conservar en lugar fresco y seco"},
    "Medialunas de manteca": {"duracion": 3, "instrucciones": "Conservar en lugar fresco y seco"},
    "Prepizza": {"temperatura_minima": 0, "temperatura_maxima": 4, "duracion": 10},
    "Pan lactal": {"duracion": 7, "instrucciones": "Conservar en lugar fresco y seco, en su envase cerrado"},
}


def cargar_alergenos_de_ejemplo(db: Session) -> int:
    """Marca alergenos y gluten de los insumos basicos y deja datos de conservacion de los productos con receta.

    El pan frances queda con la declaracion confirmada; el resto muestra lo que sugiere el sistema.
    """
    admin = db.query(Empleado).filter_by(legajo="EMP-1000").first()
    insumos = {insumo.nombre: insumo.id for insumo in db.query(Insumo).all()}
    alergenos_services.actualizar_marcas(
        db,
        alergenos_schemas.ActualizacionMarcas(
            empleado_id=admin.id,
            marcas=[
                alergenos_schemas.CambioMarcaInsumo(insumo_id=insumos[nombre], alergenos=alergenos, contiene_gluten=gluten)
                for nombre, (alergenos, gluten) in MARCAS_ALERGENOS_INSUMOS.items()
                if nombre in insumos
            ],
        ),
    )
    productos = {producto.nombre: producto.id for producto in db.query(Producto).all()}
    for nombre, datos in CONSERVACION_PRODUCTOS.items():
        if nombre in productos:
            alergenos_services.guardar_conservacion(
                db, productos[nombre], alergenos_schemas.ConservacionUpdate(empleado_id=admin.id, **datos)
            )
    if "Pan francés" in productos:
        propuesta = alergenos_services.proponer(db, productos["Pan francés"])
        alergenos_services.guardar_declaracion(
            db,
            productos["Pan francés"],
            alergenos_schemas.DeclaracionUpdate(
                empleado_id=admin.id,
                contiene=[item.alergeno for item in propuesta.contiene],
                contiene_gluten=propuesta.contiene_gluten,
                confirmar=True,
            ),
        )
    return len(MARCAS_ALERGENOS_INSUMOS)


def cargar_rotulo_de_ejemplo(db: Session) -> int | None:
    """Deja un borrador de rotulo completo del pan lactal: datos obligatorios, alergenos confirmados y un lote con fecha de duracion."""
    admin = db.query(Empleado).filter_by(legajo="EMP-1000").first()
    producto = db.query(Producto).filter_by(nombre="Pan lactal").first()
    if admin is None or producto is None:
        return None

    propuesta = alergenos_services.proponer(db, producto.id)
    alergenos_services.guardar_declaracion(
        db,
        producto.id,
        alergenos_schemas.DeclaracionUpdate(
            empleado_id=admin.id,
            contiene=[item.alergeno for item in propuesta.contiene],
            contiene_gluten=propuesta.contiene_gluten,
            confirmar=True,
        ),
    )

    rotulo = rotulados_services.crear_rotulo(
        db,
        rotulados_schemas.RotuloCrear(
            producto_id=producto.id,
            denominacion_venta="Pan de molde blanco",
            contenido_neto=550,
            unidad_contenido_neto="g",
            rnpa_rppa="RNPA 04-034512",
            razon_social="Panificadora del Valle S.R.L.",
            domicilio="Belgrano 455, Trelew, Chubut",
            instrucciones_uso="Una vez abierto, consumir dentro de los 3 días.",
        ),
        admin.id,
    )

    lote = (
        db.query(LoteProduccion)
        .filter_by(producto_id=producto.id)
        .order_by(LoteProduccion.fecha.desc(), LoteProduccion.nro_lote.desc())
        .first()
    )
    if lote is not None:
        rotulados_services.asociar_lote(
            db,
            rotulo.id,
            rotulados_schemas.RotuloLoteCrear(nro_lote=lote.nro_lote, fecha_duracion=lote.fecha + timedelta(days=7)),
            admin.id,
        )
    return rotulo.id


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
        unidad_gramos = db.query(UnidadMedida).filter(UnidadMedida.nombre == "Gramos").one()
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

        if db.query(ConfiguracionVistaPublica).count() == 0:
            crear_vista_publica_de_ejemplo(db)
            print("Vista publica de ejemplo creada (QR 'Local Centro').")

        if db.query(AlimentoReferencia).count() == 0:
            insumos_con_datos = cargar_datos_nutricionales_de_ejemplo(db)
            print(f"Base de referencia SARA importada y datos nutricionales de {insumos_con_datos} insumos cargados.")

        if db.query(ConjuntoParametros).count() == 0:
            evaluaciones = cargar_rotulado_frontal_de_ejemplo(db)
            print(f"Parametros normativos v1 publicados y {evaluaciones} evaluaciones de rotulado frontal cargadas.")

        if db.query(Receta).count() == 0:
            num_aditivos, num_recetas = cargar_aditivos_y_recetas_de_ejemplo(db, unidad_gramos)
            print(f"Catálogo de Aditivos de Referencia INS ({num_aditivos}) y Recetas enriquecidas ({num_recetas}) procesadas correctamente.")

        if db.query(CalculoSellosRotulado).count() == 0:
            admin = db.query(Empleado).filter_by(legajo="EMP-1000").first()
            num_calculados = 0
            for prod in db.query(Producto).all():
                try:
                    rotulado_frontal_services.calcular_sellos_producto(db, prod.id, admin.id)
                    num_calculados += 1
                except Exception:
                    pass
            print(f"Cálculos de sellos de advertencia ejecutados para {num_calculados} productos.")

        if db.query(DeclaracionAlergenos).count() == 0:
            marcas = cargar_alergenos_de_ejemplo(db)
            print(f"Marcas de alérgenos de {marcas} insumos y datos de conservación cargados.")

        if db.query(Rotulo).count() == 0:
            rotulo_id = cargar_rotulo_de_ejemplo(db)
            if rotulo_id is not None:
                vista = rotulados_services.obtener_vista_previa(db, rotulo_id)
                estado = "completo" if vista.completo else "con pendientes"
                print(f"Borrador de rótulo del pan lactal creado ({estado}).")

        print("Base de datos poblada exitosamente con datos de prueba enriquecidos para SAIA!")

    except Exception as e:
        db.rollback()
        print(f"Error al poblar la base de datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
