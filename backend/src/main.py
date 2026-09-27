from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.database import engine
from src.models import ModeloBase

from src.unidades_medida.models import UnidadMedida
from src.insumos.models import Insumo
from src.checklists.models import Checklist, ConsumoReal
from src.empleados.models import Empleado
from src.capacidades.models import Capacidad
from src.equipos.models import Equipo
from src.sectores.models import Sector
from src.planes.models import Plan
from src.productos_limpieza.models import ProductoLimpieza
from src.tareas.models import Tarea

#configuración validada por Pydantic
from src.config import settings

#configuracion de logger
from src.logger import setup_logging

#routers desde nuestros modulos
from src.unidades_medida.router import router as unidades_medida_router
from src.insumos.router import router as insumos_router
from src.empleados.router import router as empleados_router
from src.capacidades.router import router as capacidades_router
from src.equipos.router import router as equipos_router
from src.sectores.router import router as sectores_router
from src.planes.router import router as planes_router
from src.productos_limpieza.router import router as productos_limpieza_router
from src.tareas.router import router as tareas_router
from src.checklists.router import router as checklist_router

from fastapi.middleware.cors import CORSMiddleware

ENV = settings.ENV.upper()
ROOT_PATH = getattr(settings, f"ROOT_PATH_{ENV}", "")

setup_logging()

@asynccontextmanager
async def db_creation_lifespan(app: FastAPI):
    ModeloBase.metadata.create_all(bind=engine)
    yield

app = FastAPI(root_path=ROOT_PATH, lifespan=db_creation_lifespan)

# Permitir orígenes de desarrollo local (localhost o 127.0.0.1 en cualquier puerto)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


#routers a nuestra app
app.include_router(unidades_medida_router)
app.include_router(insumos_router)
app.include_router(empleados_router)
app.include_router(capacidades_router)
app.include_router(equipos_router)
app.include_router(sectores_router)
app.include_router(planes_router)
app.include_router(productos_limpieza_router)
app.include_router(tareas_router)
app.include_router(checklist_router)