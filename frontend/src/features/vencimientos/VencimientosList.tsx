import { useState, useEffect } from 'react';

import type {
    CategoriaVencimiento,
    EstadoVencimiento,
    ItemVencimientoConsolidado,
    ResumenVencimientos,
} from '../../types/vencimientos';
import { getVencimientosConsolidados } from '../../services/vencimientosServices';
import styles from '../../styles/shared.module.css';
import localStyles from './VencimientosList.module.css';
import TablaPaginada, {type Columna } from '../../components/TablaPaginada';
import TarjetasFiltro, { type Metrica } from '../../components/TarjetasFiltro';
import BarraFiltros from '../../components/BarraFiltros'; // <-- Importamos la barra
import { filtrarPorTexto } from '../../utils/texto';


const COLOR_ESTADO: Record<EstadoVencimiento, string> = {
    vencido: '#ef4444',
    proximo: '#f59e0b',
    vigente: '#22c55e',
};

const ETIQUETA_ESTADO: Record<EstadoVencimiento, string> = {
    vencido: 'Vencido',
    proximo: 'Próximo a vencer',
    vigente: 'Vigente',
};

const ETIQUETA_CATEGORIA: Record<CategoriaVencimiento, string> = {
    personal: 'Personal',
    documentos: 'Documentación',
    equipos: 'Elementos de Limpieza',
    calibracion: 'Calibración / Mantenimiento',
};

function textoPlazo(dias: number): string {
    if (dias < 0) return `Vencido hace ${Math.abs(dias)} días`;
    if (dias === 0) return 'Vence hoy';
    if (dias === 1) return 'Vence mañana';
    return `Vence en ${dias} días`;
}

function formatearFecha(fecha: string): string {
    if (!fecha) return '-';
    const [anio, mes, dia] = fecha.split('-');
    if (!anio || !mes || !dia) return fecha;
    return `${dia}/${mes}/${anio}`;
}

function rutaDetalle(item: ItemVencimientoConsolidado): string | null {
    const id = item.id.slice(item.id.indexOf('-') + 1);

    switch (item.categoria) {
        case 'personal':
        case 'documentos':
            return item.empleado_id == null
                ? null
                : `/empleados/${item.empleado_id}/documentacion/editar/${id}`;
        case 'equipos':
            return `/elementosLimpieza/${id}`;
        case 'calibracion':
            return `/equipos/${id}`;
    }
}

export default function VencimientosList() {
    const [resumen, setResumen] = useState<ResumenVencimientos | null>(null);
    const [filtroCategoria, setFiltroCategoria] = useState<CategoriaVencimiento | ''>('');
    const [filtroEstado, setFiltroEstado] = useState<EstadoVencimiento | ''>('');
    const [busqueda, setBusqueda] = useState<string>(''); // <-- Nuevo estado para el buscador

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            setError(null);
            const data = await getVencimientosConsolidados(filtroCategoria);
            setResumen(data);
        } catch (err) {
            console.error('Error al cargar vencimientos consolidados:', err);
            setError('No se pudo cargar la lista consolidada de vencimientos.');
        } finally {
            setCargando(false);
        }
    };



    useEffect(() => {
        cargarDatos();
    }, [filtroCategoria]);

    

    const itemsBaseMetricas = filtrarPorTexto(resumen?.items || [], busqueda);

    // 3. FILTRO EN CASCADA: Segunda etapa (Solo para la tabla, sumamos el estado de la tarjeta)
    const datosFiltrados = itemsBaseMetricas.filter(item => 
        filtroEstado === '' || item.estado === filtroEstado
    );



// 4. MÉTRICAS DINÁMICAS: Calculamos los números leyendo de `itemsBaseMetricas`
    const vencidos = itemsBaseMetricas.filter(i => i.estado === 'vencido').length;
    const proximos = itemsBaseMetricas.filter(i => i.estado === 'proximo').length;
    const vigentes = itemsBaseMetricas.filter(i => i.estado === 'vigente').length;

    const misMetricas: Metrica[] = [
        { id: 'vencido', titulo: 'VENCIDOS', valor: vencidos, color: COLOR_ESTADO.vencido },
        { id: 'proximo', titulo: 'PRÓXIMOS A VENCER', valor: proximos, color: COLOR_ESTADO.proximo },
        { id: 'vigente', titulo: 'VIGENTES', valor: vigentes, color: COLOR_ESTADO.vigente },
        { id: '', titulo: 'TOTAL CONTROLADOS', valor: itemsBaseMetricas.length, color: '#3b82f6' } 
    ];


    const misColumnas: Columna<ItemVencimientoConsolidado>[] = [
        {
            key: 'categoria',
            encabezado: 'Categoría',
            ordenable: true,
            variant: 'badge', // <--- Usamos el prop variant
            render: (item) => <span>{ETIQUETA_CATEGORIA[item.categoria] || item.categoria_label}</span>
        },
        {
            key: 'titulo',
            encabezado: 'Vencimiento / Título',
            ordenable: true,
            variant: 'titulo', // <--- Usamos el prop variant
            render: (item) => {
                const destino = rutaDetalle(item);
                return destino
                    ? <Link to={destino} className={localStyles.link}>{item.titulo}</Link>
                    : item.titulo;
            }
        },
        {
            key: 'detalle',
            encabezado: 'Detalle y Referencia',
            ordenable: false,
            variant: 'celdaBase', // <--- Usamos el prop variant
            render: (item) => (
                <>
                    <div>{item.detalle}</div>
                    {item.referencia && <div>{item.referencia}</div>}
                </>
            )
        },
        {
            key: 'fecha_vencimiento',
            encabezado: 'Fecha Venc.',
            ordenable: true,
            variant: 'fecha', // <--- Usamos el prop variant
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
            render: (item) => textoPlazo(item.dias_restantes)
        }
    ];


    // Armamos la configuración de nuestros selectores adicionales
    const misFiltros = [
        {
            label: "Categoría / Tipo:",
            value: filtroCategoria,
            onChange: (val: string) => setFiltroCategoria(val as CategoriaVencimiento | ''),
            opciones: [
                { value: "", label: "Todas las categorías" },
                { value: "personal", label: "Personal / Libretas" },
                { value: "documentos", label: "Documentación General" },
                { value: "equipos", label: "Elementos de Limpieza" },
                { value: "calibracion", label: "Calibración y Mantenimiento" }
            ]
        }
    ];


    const limpiarFiltros = () => {
        setFiltroCategoria('');
        setFiltroEstado('');
        setBusqueda('');
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Vista Consolidada de Vencimientos</h2>

            <p style={{ marginTop: '-10px', marginBottom: '20px', color: 'var(--text-muted)' }}>
                Monitoreo unificado de vencimientos de personal, documentos, elementos de limpieza y calibraciones de la planta.
            </p>

            {/* Tarjeta rectangular única que engloba las 4 métricas globales */}
            {resumen && (
                <TarjetasFiltro 
                    metricas={misMetricas}
                    filtroActual={filtroEstado}
                    onFiltroChange={(estado) => setFiltroEstado(estado as EstadoVencimiento | '')}
                />
            )}
                <BarraFiltros
                busqueda={busqueda}
                onBusquedaChange={setBusqueda}
                placeholderBusqueda="Buscar por título o detalle..."
                onLimpiar={limpiarFiltros}
                mostrarBotonLimpiar={filtroCategoria !== '' || filtroEstado !== '' || busqueda !== ''}
                filtros={misFiltros} // <-- Inyectamos la data
            />

            {error && <p style={{ color: '#ef4444', maxWidth: '1100px' }}>{error}</p>}

            {/* TABLA MODULARIZADA */}
            {!cargando && (
                <div style={{ maxWidth: '1100px', width: '100%' }}>
                    <TablaPaginada
                        datos={datosFiltrados}
                        columnas={misColumnas}
                        gridTemplateColumns="1.4fr 1.8fr 2.2fr 1.1fr 1.3fr 1.2fr"
                        itemsPorPagina={5}
                        mensajeVacio="No se encontraron vencimientos con los filtros seleccionados."
                        columnaOrdenInicial='dias_restantes'
                    />
                </div>
            )}
        </div>
    );
}
