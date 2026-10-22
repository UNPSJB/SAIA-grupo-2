import { useEffect, useState } from 'react';
import type { AlertaVencimiento } from '../../types/documentacion';
import type { Empleado } from '../../types/empleados';
import { getAlertasDocumentacion } from '../../services/documentacionServices';
import { getEmpleados } from '../../services/empleadosServices';
import Boton from '../../components/Boton';
import {
    COLOR_ESTADO,
    ETIQUETA_ESTADO,
    ETIQUETA_TIPO,
    formatearFecha,
    textoVencimiento,
} from '../documentacion/estadoVencimiento';
import styles from '../../styles/shared.module.css';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import TarjetasFiltro, { type Metrica } from '../../components/TarjetasFiltro';
import BarraFiltros, { type FiltroConfig } from '../../components/BarraFiltros'; // <-- Importamos la barra
import { filtrarPorTexto } from '../../utils/texto';

export default function VencimientosDocumentacionList() {
    const [vencimientos, setVencimientos] = useState<AlertaVencimiento[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);

    const [empleadoId, setEmpleadoId] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    const [filtroEstado, setFiltroEstado] = useState<string>('');

    const [busqueda, setBusqueda] = useState('');

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const cargarEmpleados = async () => {
        try {
            const data = await getEmpleados();
            setEmpleados(data);
        } catch (error) {
            console.error('Error al cargar empleados:', error);
            setError('No se pudieron cargar los empleados.');
        }
    };

    const cargarVencimientos = async () => {
        setCargando(true);
        setError('');

        try {
            const data = await getAlertasDocumentacion(
                undefined,
                empleadoId ? Number(empleadoId) : undefined,
                fechaDesde || undefined,
                fechaHasta || undefined
            );

            setVencimientos(data);
        } catch (error) {
            console.error('Error al cargar vencimientos:', error);
            setError('No se pudieron cargar los vencimientos.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarEmpleados();
    }, []);

    useEffect(() => {
        cargarVencimientos();
    }, [empleadoId, fechaDesde, fechaHasta]);

    const limpiarFiltros = () => {
        setEmpleadoId('');
        setFechaDesde('');
        setFechaHasta('');
        setFiltroEstado('');
    };


    // const itemsBaseMetricas = filtrarPorTexto(resumen?.items || [], busqueda);
    const itemsBaseMetricas = filtrarPorTexto(vencimientos, busqueda);

    // 2. FILTRO EN CASCADA: Segunda etapa (Sumamos el estado de la tarjeta solo para la tabla)
    const datosFiltrados = itemsBaseMetricas.filter((v) => 
        filtroEstado === '' || v.estado === filtroEstado
    );

// 3. MÉTRICAS DINÁMICAS: Leemos los números de la base filtrada por texto
    const vencidos = itemsBaseMetricas.filter((v) => v.estado === 'vencido').length;
    const proximos = itemsBaseMetricas.filter((v) => v.estado === 'proximo').length;
    const vigentes = itemsBaseMetricas.filter((v) => v.estado === 'vigente').length;

    // --- Definimos las métricas para pasarle al componente genérico ---
    const misMetricas: Metrica[] = [
        { id: 'vencido', titulo: 'VENCIDOS', valor: vencidos, color: COLOR_ESTADO.vencido },
        { id: 'proximo', titulo: 'PRÓXIMOS A VENCER', valor: proximos, color: COLOR_ESTADO.proximo },
        { id: 'vigente', titulo: 'VIGENTES', valor: vigentes, color: COLOR_ESTADO.vigente },
        { id: '', titulo: 'TOTAL CONTROLADOS', valor: itemsBaseMetricas.length, color: '#3b82f6' }
    ];


    // --- CONFIGURACIÓN DE COLUMNAS PARA LA TABLA ---
    const misColumnas: Columna<AlertaVencimiento>[] = [
        {
            key: 'persona',
            encabezado: 'Persona',
            ordenable: true,
            valorOrdenamiento: (item) => `${item.empleado.apellido} ${item.empleado.nombre}`,
            variant: 'titulo',
            render: (item) => `${item.empleado.apellido}, ${item.empleado.nombre}`
        },
        {
            key: 'tipo',
            encabezado: 'Tipo',
            ordenable: true,
            valorOrdenamiento: (item) => ETIQUETA_TIPO[item.tipo],
            variant: 'celdaBase',
            render: (item) => ETIQUETA_TIPO[item.tipo]
        },
        {
            key: 'descripcion',
            encabezado: 'Detalle',
            ordenable: false,
            variant: 'celdaBase',
            render: (item) => item.descripcion
        },
        {
            key: 'fecha_vencimiento',
            encabezado: 'Vencimiento',
            ordenable: true,
            variant: 'fecha',
            render: (item) => formatearFecha(item.fecha_vencimiento)
        },
        {
            key: 'estado',
            encabezado: 'Estado',
            ordenable: true,
            // Construimos dinámicamente el nombre de la clase (ej: "estado_vencido")
            variant: (item) => `estado_${item.estado}`,
            render: (item) => ETIQUETA_ESTADO[item.estado]
        },
        {
            key: 'dias_restantes',
            encabezado: 'Plazo',
            ordenable: true,
            valorOrdenamiento: (item) => item.dias_restantes,
            // Construimos dinámicamente el nombre de la clase (ej: "plazo_proximo")
            variant: (item) => `plazo_${item.estado}`,
            render: (item) => textoVencimiento(item.dias_restantes)
        }
    ];


    const misFiltros: FiltroConfig[] = [
        {
            label: 'Persona',
            value: empleadoId,
            onChange: setEmpleadoId,
            type: 'select',
            opciones: [
                { value: '', label: 'Todas las personas' },
                ...empleados.map(emp => ({ value: String(emp.id), label: `${emp.apellido}, ${emp.nombre}` }))
            ]
        },
        {
            label: 'Vencimiento desde',
            value: fechaDesde,
            onChange: setFechaDesde,
            type: 'date'
        },
        {
            label: 'Vencimiento hasta',
            value: fechaHasta,
            onChange: setFechaHasta,
            type: 'date'
        }
    ];




    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Vencimientos de Personal</h2>

            {!cargando && (
                <TarjetasFiltro 
                    metricas={misMetricas}
                    filtroActual={filtroEstado}
                    onFiltroChange={setFiltroEstado}
                />
            )}


           <BarraFiltros
                busqueda={busqueda}
                onBusquedaChange={setBusqueda}
                placeholderBusqueda="Buscar por nombre o detalle..."
                onLimpiar={limpiarFiltros}
                mostrarBotonLimpiar={empleadoId !== '' || fechaDesde !== '' || fechaHasta !== '' || filtroEstado !== '' || busqueda !== ''}
                filtros={misFiltros}
            />

            {error && (
                <p style={{ color: '#ef4444', marginTop: '15px' }}>
                    {error}
                </p>
            )}

            <div style={{ maxWidth: '1000px', width: '100%', marginTop: '20px' }}>
                {cargando ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Cargando vencimientos...
                    </div>
                ) : (
                    <TablaPaginada
                        datos={datosFiltrados}
                        columnas={misColumnas}
                        gridTemplateColumns="1.8fr 1.5fr 2fr 1.3fr 1.4fr 1.4fr"
                        itemsPorPagina={10}
                        mensajeVacio="No se encontraron vencimientos con los filtros seleccionados."
                        columnaOrdenInicial='persona'
                    />
                )}
            </div>
        </div>
    );
}