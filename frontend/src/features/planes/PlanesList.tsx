import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { PlanLimpieza } from '../../types/planes';
import { getPlanes } from '../../services/planesServices';
import Boton from '../../components/Boton';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/shared.module.css';

import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';


export default function PlanesList() {
    const { usuario } = useAuth();
    const [planes, setPlanes] = useState<PlanLimpieza[]>([]);

    const [busqueda, setBusqueda] = useState('');
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getPlanes();
                setPlanes(data);
            } catch (error) {
                console.error("Error al cargar planes:", error);
            }
        };
        cargarDatos();
    }, []);
    const planesFiltrados = filtrarPorTexto(planes, busqueda, (c) => [c.titulo, c.sector?.nombre]);

    const misColumnas: Columna<PlanLimpieza>[] = [
        {
            key: 'titulo',
            encabezado: 'Título',
            ordenable: true,
            variant: 'titulo', // Inyecta font-weight 600 y el color var(--text-h)
            render: (plan) => plan.titulo
        },
        {
            key: 'sector',
            encabezado: 'Sector',
            ordenable: true,
            variant: 'celdaBase',
            valorOrdenamiento: (plan) => plan.sector?.nombre || 'zzz', // Los "Sin sector" se van al final al ordenar
            render: (plan) => plan.sector?.nombre || <span style={{ opacity: 0.6 }}>Sin sector</span>
        },
        {
            key: 'fecha_inicio',
            encabezado: 'Inicio',
            ordenable: true,
            variant: 'fecha', // Ajusta el tamaño de la fuente para fechas
            render: (plan) => plan.fecha_inicio
        },
        {
            key: 'fecha_fin',
            encabezado: 'Fin',
            ordenable: true,
            variant: 'fecha',
            valorOrdenamiento: (plan) => plan.fecha_fin || 'zzz', // Los "Sin límite" se van al final
            render: (plan) => plan.fecha_fin || <span style={{ opacity: 0.6, fontStyle: 'italic' }}>Sin límite</span>
        },
        {
            key: 'equipos',
            encabezado: 'Equipos',
            ordenable: true,
            variant: 'celdaBase',
            valorOrdenamiento: (plan) => plan.equipos?.length || 0,
            render: (plan) => <span style={{ fontWeight: '600' }}>{plan.equipos?.length || 0}</span>
        },
        {
            key: 'tareas',
            encabezado: 'Tareas',
            ordenable: true,
            variant: 'celdaBase',
            valorOrdenamiento: (plan) => plan.tareas?.length || 0,
            render: (plan) => <span style={{ fontWeight: '600' }}>{plan.tareas?.length || 0}</span>
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones', // Inyecta display flex y gap sin usar wrapper extra
            render: (plan) => (
                <>
                    {usuario?.rol === 'admin' && (
                        <Link to={`/planes/editar/${plan.id}`} title="Editar plan">
                            <Boton variant="editar" />
                        </Link>
                    )}
                    <Link to={`/planes/${plan.id}`} title="Ver detalle del plan">
                        <Boton variant="ver" />
                    </Link>
                    {usuario?.rol === 'admin' && (
                        <Link to={`/planes/eliminar/${plan.id}`} title="Eliminar plan">
                            <Boton variant="eliminar" />
                        </Link>
                    )}
                </>
            )
        }
    ];
    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Gestión de Planes de Limpieza</h2>
            

            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '1100px', marginBottom: '16px' }}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar plan o sector..." />
            </div>
            {usuario?.rol === 'admin' && (
                <Link to="/planes/nuevo" className={styles.linkCrear}>
                    <Boton variant="crear">Crear Nuevo Plan</Boton>
                </Link>
            )}

            <TablaPaginada
                datos={planesFiltrados}
                columnas={misColumnas}
                gridTemplateColumns="2fr 1.5fr 1fr 1fr 0.8fr 0.8fr 1.8fr"
                itemsPorPagina={10}
                mensajeVacio="No hay planes registrados."
                columnaOrdenInicial="titulo"
            />

        </div>
    );
}
