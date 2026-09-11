from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.database import engine
from src.models import ModeloBase

from src.unidades_medida.models import UnidadMedida
from src.insumos.models import Insumo

# Importamos la configuración validada por Pydantic
from src.config import settings

# Importamos configuracion de logger
from src.logger import setup_logging

# Importamos los routers desde nuestros modulos

from src.unidades_medida.router import router as unidades_medida_router
from src.insumos.router import router as insumos_router
from src.empleados.router import router as empleados_router
from src.capacidades.router import router as capacidades_router
from src.equipos.router import router as equipos_router
from fastapi.middleware.cors import CORSMiddleware

ENV = settings.ENV.upper()
ROOT_PATH = getattr(settings, f"ROOT_PATH_{ENV}", "")

setup_logging()

@asynccontextmanager
async def db_creation_lifespan(app: FastAPI):
    ModeloBase.metadata.create_all(bind=engine)
    yield


app = FastAPI(root_path=ROOT_PATH, lifespan=db_creation_lifespan)

# Usamos "*" para que acepte peticiones desde cualquier puerto (5173, 5174, etc.)
origins = [
    "*" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# asociamos los routers a nuestra app

app.include_router(unidades_medida_router)
app.include_router(insumos_router)
app.include_router(empleados_router)
app.include_router(capacidades_router)
app.include_router(equipos_router)

