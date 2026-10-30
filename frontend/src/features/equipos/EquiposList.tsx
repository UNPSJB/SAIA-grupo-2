import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Equipo } from '../../types/equipos';
import { getEquipos } from '../../services/equiposServices';
import { COLOR_ESTADO, ETIQUETA_ESTADO } from './estadoMantenimiento';
import Boton from '../../components/Boton';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/shared.module.css';
import RegistrarCalibracionModal from './RegistrarCalibracionModal';

import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';

import TablaPaginada, { type Columna } from '../../components/TablaPaginada';

export default function EquiposList() {
    const [equipoParaCalibrar, setEquipoParaCalibrar] = useState<Equipo | null>(null);

    const [busqueda, setBusqueda] = useState('');
    const { usuario } = useAuth();
    const [equipos, setEquipos] = useState<Equipo[]>([]);

    const cargarDatos = async () => {
        try {
            const data = await getEquipos();
            const datosOrdenados = data.sort((a, b) => {
                if (a.activo === b.activo) return 0;
                return a.activo ? -1 : 1;
            });
            setEquipos(datosOrdenados);
        } catch (error) {
            console.error("Error al cargar equipos:", error);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);
    const equiposFiltrados = filtrarPorTexto(equipos, busqueda, (c) => [c.nombre, c.sector?.nombre, c.tipo?.nombre]);

    //casi todos estos estilos no tendrian que estar aca y se tendria que usar las variantes
    //para corregir a futuro
    const misColumnas: Columna<Equipo>[] = [
        {
            key: 'nombre',
            encabezado: 'Nombre del Equipo',
            ordenable: true,
            variant: 'titulo',
            render: (eq) => eq.nombre
        },
        {
            key: 'tipo',
            encabezado: 'Categoría',
            ordenable: true,
            variant: 'badge',
            valorOrdenamiento: (eq) => eq.tipo?.nombre,
            render: (eq) => eq.tipo.nombre
        },
        {
            key: 'sector',
            encabezado: 'Sector',
            ordenable: true,
            valorOrdenamiento: (eq) => eq.sector?.nombre || '',
            render: (eq) => eq.sector ? eq.sector.nombre : <span style={{ color: 'var(--text-muted)' }}>Sin asignar</span>
        },
        {
            key: 'activo',
            encabezado: 'Sistema',
            ordenable: true,
            variant: (eq) => eq.activo? 'activo': 'inactivo', 
            render: (eq) => eq.activo ? `Activo` : `Inactivo`
        },
        {
            key: 'estado',
            encabezado: 'Condición',
            ordenable: true,
            variant: (eq)=> eq.estado === 'bueno' ? 'activo': 'inactivo',
            render: (eq) => eq.estado === 'bueno' ? `Bueno`:`Dañado`
        },
        {
            key: 'estado_mantenimiento',
            encabezado: 'Mantenimiento',
            ordenable: true,
            variant: (eq) =>  `estado_${eq.estado_mantenimiento}`,
            valorOrdenamiento: (eq) => ETIQUETA_ESTADO[eq.estado_mantenimiento]=== 'Sin control'? 'zzz':ETIQUETA_ESTADO[eq.estado_mantenimiento],
            render: (eq) => ETIQUETA_ESTADO[eq.estado_mantenimiento]
        },
        {
            key: 'frecuencia_mantenimiento_dias',
            encabezado: 'Frecuencia',
            ordenable: true,
            variant: (eq)=> eq.frecuencia_mantenimiento_dias ? 'badge':'muted',
            //aca no funciono lo de poner una "a" como en elementos de limpieza no se por que
            valorOrdenamiento: (eq)=> eq.frecuencia_mantenimiento_dias? eq.frecuencia_mantenimiento_dias: 99999, 
            render: (eq) => eq.frecuencia_mantenimiento_dias ? `Cada ${eq.frecuencia_mantenimiento_dias} días` : `No definido`
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            render: (eq) => (
                <div className={styles.grupoBotonesTabla}>
                    {eq.frecuencia_mantenimiento_dias !== null && (
                        <Boton variant="guardar" title="Registrar calibración" onClick={() => setEquipoParaCalibrar(eq)} />
                    )}

                    {usuario?.rol === 'admin' && (
                        <Link to={`/equipos/editar/${eq.id}`} title="Editar equipo">
                            <Boton variant="editar" />
                        </Link>
                    )}
                    <Link to={`/equipos/${eq.id}`} title="Ver detalle">
                        <Boton variant="ver" />
                    </Link>
                    {usuario?.rol === 'admin' && (
                        <Link to={`/equipos/eliminar/${eq.id}`} title="Eliminar registro">
                            <Boton variant="eliminar" />
                        </Link>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Inventario de Equipamiento</h2>

            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '1100px', marginBottom: '16px' }}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar equipo, sector o tipo..." />
            </div>

            
            {usuario?.rol === 'admin' && (
                <Link to="/equipos/nuevo" className={styles.linkCrear}>
                    <Boton variant="crear">
                        Registrar Equipo
                    </Boton>
                </Link>
            )}

            <TablaPaginada
                datos={equiposFiltrados}
                columnas={misColumnas}
                gridTemplateColumns="1.5fr 1.5fr 1fr 1fr 0.8fr 1.2fr 1.3fr 1.8fr"
                itemsPorPagina={5}
                mensajeVacio="No hay equipos registrados."
                columnaOrdenInicial="activo"
                ordenAscInicial={false} // Inicializa con los Activos (true) primero
            />

            {equipoParaCalibrar && (
                <RegistrarCalibracionModal
                    equipo={equipoParaCalibrar}
                    onClose={() => setEquipoParaCalibrar(null)}
                    onSuccess={() => {
                        void cargarDatos();
                    }}
                />
            )}
        </div>
    );
}