import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Empleado } from '../../types/empleados';
import { getEmpleados } from '../../services/empleadosServices';
import Boton from '../../components/Boton';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/shared.module.css';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import TarjetasFiltro, { type Metrica } from '../../components/TarjetasFiltro'; // <-- Importamos el componente y el tipo
import BarraFiltros, { type FiltroConfig } from '../../components/BarraFiltros'; // <-- Importamos la barra
import { filtrarPorTexto } from '../../utils/texto';


export default function EmpleadosList() {
    const { usuario } = useAuth();
    const [empleados, setEmpleados] = useState<Empleado[]>([]);

    // Estados para los filtros
    const [filtroActual, setFiltroActual] = useState<string>(''); // Para las tarjetas (activos/inactivos)
    const [filtroRol, setFiltroRol] = useState<string>('');       // Para el menú desplegable
    const [busqueda, setBusqueda] = useState<string>('');         // Para el buscador


    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getEmpleados();
                
                // const datosOrdenados = data.sort((a, b) => {
                //     if (a.activo === b.activo) return 0;
                //     return a.activo ? -1 : 1;
                // });
                
                setEmpleados(data);
            } catch (error) {
                console.error("Error al cargar empleados:", error);
            }
        };
        
        cargarDatos();
    }, []);


    const rolesDisponibles = Array.from(
        new Set(
            empleados.flatMap(emp => emp.capacidades?.map(cap => cap.nombre) || [])
        )
    ).sort();


    const empleadosBase = filtrarPorTexto(
        empleados.filter((emp) => !filtroRol || emp.capacidades?.some((c) => c.nombre === filtroRol)),
        busqueda
    );

    const empleadosFiltrados = empleadosBase.filter(emp => {
        if (filtroActual === 'activos') return emp.activo;
        if (filtroActual === 'inactivos') return !emp.activo;
        return true;
    });

// 1. Calculamos los números usando "empleadosBaseMétricas" en lugar de "empleados"
    const activos = empleadosBase.filter(e => e.activo).length;
    const inactivos = empleadosBase.filter(e => !e.activo).length;

    // 2. Definimos las tarjetas pasándole el título, valor y color
    const misMetricas: Metrica[] = [
        { id: 'activos', titulo: 'ACTIVOS', valor: activos, color: '#22c55e' }, 
        { id: 'inactivos', titulo: 'INACTIVOS', valor: inactivos, color: '#ef4444' }, 
        { id: '', titulo: 'TOTAL EMPLEADOS', valor: empleadosBase.length, color: '#64748b' } 
    ];

    const misFiltros: FiltroConfig[] = [
        {
            label: 'Filtrar por Rol:',
            value: filtroRol,
            onChange: setFiltroRol,
            type: 'select',
            opciones: [
                { value: '', label: 'Todos los roles' },
                ...rolesDisponibles.map(rol => ({ value: rol, label: rol }))
            ]
        }
    ];

    const limpiarFiltros = () => {
        setFiltroActual('');
        setFiltroRol('');
        setBusqueda('');
    };


    // Mini-componente para limpiar la configuración de columnas
    const RenderBotonesAccion = ({ emp }: { emp: Empleado }) => (
        <div className={styles.grupoBotonesTabla}>
            {usuario?.rol === 'admin' && (
                <Link to={`/empleados/editar/${emp.id}`} title="Editar empleado">
                    <Boton variant="editar" style={{ padding: '8px 12px' }}></Boton>
                </Link>
            )}
            <Link to={`/empleados/${emp.id}`} title="Ver detalle">
                <Boton variant="ver" style={{ padding: '8px 12px' }}></Boton>
            </Link>
            {usuario?.rol === 'admin' && (
                <Link to={`/empleados/${emp.id}/documentacion`} title="Documentación y vencimientos">
                    <Boton variant="documentos" style={{ padding: '8px 12px' }}></Boton>
                </Link>
            )}
            {usuario?.rol === 'admin' && !emp.activo && (
                <Link to={`/empleados/eliminar/${emp.id}`} title="Eliminar físicamente">
                    <Boton variant="eliminar" style={{ padding: '8px 12px' }}></Boton>
                </Link>
            )}
        </div>
    );



    
// --- CONFIGURACIÓN DE COLUMNAS PARA LA TABLA ---
    const misColumnas: Columna<Empleado>[] = [
        {
            key: 'legajo',
            encabezado: 'Legajo',
            ordenable: true,
            variant: 'titulo',
            render: (emp) => emp.legajo
        },
        {
            key: 'nombre',
            encabezado: 'Nombre Completo',
            ordenable: true,
            variant: 'titulo',
            // valorOrdenamiento: (emp) => `${emp.nombre} ${emp.apellido}`,
            render: (emp) => `${emp.nombre} ${emp.apellido}`
        },
        {
            key: 'sectores',
            encabezado: 'Sector/es',
            ordenable: false,
            render: (emp) => (
                <div style={{ color: 'var(--text)', textAlign: 'center' }}>
                    {emp.sectores && emp.sectores.length > 0 ? (
                        emp.sectores.map(sec => sec.nombre).join(', ')
                    ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Sin asignar</span>
                    )}
                </div>
            )
        },
{
            key: 'capacidades',
            encabezado: 'Roles Asignados',
            ordenable: false,
            variant: 'badgeGrupo', 
            render: (emp) => (
                <>
                    {emp.capacidades && emp.capacidades.length > 0 ? (
                        emp.capacidades.map(cap => {
                            // Preguntamos antes si es admin
                            const esAdmin = cap.nombre.toLowerCase() === 'administrador';
                            
                            return (
                                <span 
                                    key={cap.id} 
                                    // Si es admin, le sumamos la variante de shared.module.css
                                    className={`${styles.badge} ${esAdmin ? styles.badgeAdmin : ''}`}
                                >
                                    {cap.nombre}
                                </span>
                            );
                        })
                    ) : (
                        <span className={styles.badge} style={{ color: 'var(--text-muted)' }}>
                            Sin asignar
                        </span>
                    )}
                </>
            )
        },
        {
            key: 'activo',
            encabezado: 'Estado',
            ordenable: true,
            valorOrdenamiento: (emp) => (emp.activo ? 0 : 1), 
            render: (emp) => (
                emp.activo 
                    ? <span style={{ color: 'var(--verde-estandar)', fontWeight: 'bold' }}>Activo</span> 
                    : <span style={{ color: 'var(--rojo-estandar)', fontWeight: 'bold' }}>Inactivo</span>
            )
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            ordenable: false,
            render: (emp) => <RenderBotonesAccion emp={emp} /> // <-- Mucho más limpio
        }
    ];

    return (
        <div className={styles.contenedorPrincipal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1100px', marginBottom: '20px' }}>
                <h2>Directorio de Personal</h2>
                {usuario?.rol === 'admin' && (
                    <Link to="/empleados/nuevo">
                        <Boton variant="crear">
                            Registrar Empleado
                        </Boton>
                    </Link>
                )}
            </div>

            {/* Inyectamos nuestras métricas al componente genérico */}
            {empleados.length > 0 && (
                <TarjetasFiltro 
                    metricas={misMetricas}
                    filtroActual={filtroActual}
                    onFiltroChange={setFiltroActual}
                />
            )}

            {/* Aplicamos la nueva Barra Modular */}
            <BarraFiltros
                busqueda={busqueda}
                onBusquedaChange={setBusqueda}
                placeholderBusqueda="Buscar por legajo o nombre..."
                onLimpiar={limpiarFiltros}
                mostrarBotonLimpiar={filtroActual !== '' || filtroRol !== '' || busqueda !== ''}
                filtros={misFiltros}
            />

           <div style={{ maxWidth: '1100px', width: '100%' }}>
                <TablaPaginada
                    datos={empleadosFiltrados}
                    columnas={misColumnas}
                    gridTemplateColumns="1fr 2fr 1.5fr 2.5fr 1fr 1.5fr"
                    itemsPorPagina={5}
                    mensajeVacio="No se encontraron empleados con los filtros actuales."
                    columnaOrdenInicial="activo" 
                    ordenAscInicial={true}
                />
            </div>
        </div>
    );
}