import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Tarea } from '../../types/tareas';
import { getTareas } from '../../services/tareasServices';
import Boton from '../../components/Boton';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/shared.module.css';

import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';

export default function TareasList() {
    const { usuario } = useAuth();
    const [tareas, setTareas] = useState<Tarea[]>([]);

    const [busqueda, setBusqueda] = useState('');
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getTareas();
                setTareas(data);
            } catch (error) {
                console.error("Error al cargar tareas:", error);
            }
        };
        cargarDatos();
    }, []);
    const tareasFiltradas = filtrarPorTexto(tareas, busqueda, (c) => [c.titulo, c.frecuencia]);

    
    const misColumnas: Columna<Tarea>[] = [
        {
            key: 'titulo',
            encabezado: 'Título',
            ordenable: true,
            variant: 'titulo', // Inyecta color var(--text-h) y font-weight 600 automáticamente
            render: (tarea) => tarea.titulo
        },
        {
            key: 'frecuencia',
            encabezado: 'Frecuencia',
            ordenable: true,
            variant: 'celdaBase', // Letra estándar
            render: (tarea) => <span style={{ textTransform: 'capitalize' }}>{tarea.frecuencia}</span>
        },
        {
            key: 'planes',
            encabezado: 'Planes Asociados',
            ordenable: true,
            variant: 'celdaBase',
            valorOrdenamiento: (tarea) => tarea.planes && tarea.planes.length > 0 
                ? tarea.planes.map(p => p.titulo).join(', ') 
                : '',
            render: (tarea) => (
                tarea.planes && tarea.planes.length > 0 ? (
                    tarea.planes.map(p => p.titulo).join(', ')
                ) : (
                    <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Sin plan</span>
                )
            )
        },
        {
            key: 'consumos',
            encabezado: 'Insumos',
            ordenable: true,
            variant: 'celdaBase',
            valorOrdenamiento: (tarea) => tarea.consumos_estimados ? tarea.consumos_estimados.length : 0,
            render: (tarea) => (
                tarea.consumos_estimados && tarea.consumos_estimados.length > 0 ? (
                    <span style={{ fontWeight: '600', color: 'var(--verde-texto)' }}>
                        {tarea.consumos_estimados.length} {tarea.consumos_estimados.length === 1 ? 'producto' : 'productos'}
                    </span>
                ) : (
                    <span style={{ opacity: 0.6 }}>Ninguno</span>
                )
            )
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones', // Inyecta el display: flex y el gap automáticamente sin necesidad de un div extra
            render: (tarea) => (
                <>
                    {usuario?.rol === 'admin' && (
                        <>
                            <Link to={`/tareas/editar/${tarea.id}`}>
                                <Boton variant="editar" />
                            </Link>
                            <Link to={`/tareas/eliminar/${tarea.id}`}>
                                <Boton variant="eliminar" />
                            </Link>
                        </>
                    )}
                </>
            )
            }
    ];


    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Gestión de Tareas y Checklists</h2>
            

            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '1100px', marginBottom: '16px' }}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar tarea..." />
            </div>
            {usuario?.rol === 'admin' && (
                <Link to="/tareas/nueva" className={styles.linkCrear}>
                    <Boton variant="crear">Nueva Tarea</Boton>
                </Link>
            )}

            <TablaPaginada
                datos={tareasFiltradas}
                columnas={misColumnas}
                gridTemplateColumns="2fr 1fr 2fr 1fr 1.5fr"
                itemsPorPagina={10}
                mensajeVacio="No hay tareas registradas."
                columnaOrdenInicial="titulo"
            />


        </div>
    );
}