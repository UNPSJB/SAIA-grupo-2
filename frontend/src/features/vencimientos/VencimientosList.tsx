import { useState, useEffect } from 'react';

import type {
    CategoriaVencimiento,
    EstadoVencimiento,
    ItemVencimientoConsolidado,
    ResumenVencimientos,
} from '../../types/vencimientos';
import { getVencimientosConsolidados } from '../../services/vencimientosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

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
    equipos: 'Elementos / Equipamiento',
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

export default function VencimientosList() {
    const [resumen, setResumen] = useState<ResumenVencimientos | null>(null);
    const [filtroCategoria, setFiltroCategoria] = useState<CategoriaVencimiento | ''>('');
    const [filtroEstado, setFiltroEstado] = useState<EstadoVencimiento | ''>('');
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 5;

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            setError(null);
            const data = await getVencimientosConsolidados(filtroCategoria, filtroEstado);
            setResumen(data);
            setPaginaActual(1);
        } catch (err) {
            console.error('Error al cargar vencimientos consolidados:', err);
            setError('No se pudo cargar la lista consolidada de vencimientos.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [filtroCategoria, filtroEstado]);

    const itemsConsolidados = resumen ? resumen.items : [];
    const totalPaginas = Math.ceil(itemsConsolidados.length / elementosPorPagina) || 1;
    const indiceUltimo = paginaActual * elementosPorPagina;
    const indicePrimer = indiceUltimo - elementosPorPagina;
    const itemsPaginados = itemsConsolidados.slice(indicePrimer, indiceUltimo);

    if (cargando && !resumen) {
        return (
            <div className={styles.contenedorPrincipal}>
                <h2>Vista Consolidada de Vencimientos</h2>
                <p>Cargando información de la base de datos...</p>
            </div>
        );
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Vista Consolidada de Vencimientos</h2>

            <p style={{ marginTop: '-10px', marginBottom: '20px', color: 'var(--text-muted)' }}>
                Monitoreo unificado de vencimientos de personal, documentos, elementos de limpieza y calibraciones de la planta.
            </p>

            {/* Tarjeta rectangular única que engloba las 4 métricas globales */}
            {resumen && (
                <div
                    className={styles.tarjetaEstatica}
                    style={{
                        width: '100%',
                        maxWidth: '1100px',
                        marginBottom: '25px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        padding: '20px 10px',
                        textAlign: 'center',
                        alignItems: 'center',
                    }}
                >
                    <div style={{ borderRight: '1px solid #e2e8f0', padding: '0 15px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            VENCIDOS
                        </span>
                        <h3 style={{ fontSize: '1.8rem', margin: '5px 0 0 0', color: COLOR_ESTADO.vencido }}>
                            {resumen.vencidos}
                        </h3>
                    </div>

                    <div style={{ borderRight: '1px solid #e2e8f0', padding: '0 15px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            PRÓXIMOS A VENCER
                        </span>
                        <h3 style={{ fontSize: '1.8rem', margin: '5px 0 0 0', color: COLOR_ESTADO.proximo }}>
                            {resumen.proximos}
                        </h3>
                    </div>

                    <div style={{ borderRight: '1px solid #e2e8f0', padding: '0 15px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            VIGENTES
                        </span>
                        <h3 style={{ fontSize: '1.8rem', margin: '5px 0 0 0', color: COLOR_ESTADO.vigente }}>
                            {resumen.vigentes}
                        </h3>
                    </div>

                    <div style={{ padding: '0 15px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            TOTAL CONTROLADOS
                        </span>
                        <h3 style={{ fontSize: '1.8rem', margin: '5px 0 0 0', color: '#3b82f6' }}>
                            {resumen.total}
                        </h3>
                    </div>
                </div>
            )}

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '15px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    maxWidth: '1100px',
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: 'var(--bg-card, #ffffff)',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
            >
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            Categoría / Tipo:
                        </label>
                        <select
                            value={filtroCategoria}
                            onChange={(e) => setFiltroCategoria(e.target.value as CategoriaVencimiento | '')}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.9rem' }}
                        >
                            <option value="">Todas las categorías</option>
                            <option value="personal">Personal / Libretas</option>
                            <option value="documentos">Documentación General</option>
                            <option value="equipos">Elementos y Equipamiento</option>
                            <option value="calibracion">Calibración y Mantenimiento</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            Estado de Urgencia:
                        </label>
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value as EstadoVencimiento | '')}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.9rem' }}
                        >
                            <option value="">Todos los estados</option>
                            <option value="vencido">Vencido</option>
                            <option value="proximo">Próximo a vencer</option>
                            <option value="vigente">Vigente</option>
                        </select>
                    </div>
                </div>

                <Boton
                    variant="volver"
                    onClick={() => {
                        setFiltroCategoria('');
                        setFiltroEstado('');
                    }}
                >
                    Limpiar Filtros
                </Boton>
            </div>

            {error && <p style={{ color: '#ef4444', maxWidth: '1100px' }}>{error}</p>}

            {/* Tabla Consolidada */}
            <div className={styles.contenedorTabla} style={{ maxWidth: '1100px' }}>
                <div
                    className={styles.filaHeader}
                    style={{ gridTemplateColumns: '1.4fr 1.8fr 2.2fr 1.1fr 1.3fr 1.2fr' }}
                >
                    <div>Categoría</div>
                    <div>Vencimiento / Título</div>
                    <div>Detalle y Referencia</div>
                    <div>Fecha Venc.</div>
                    <div>Estado</div>
                    <div>Plazo</div>
                </div>

                {itemsPaginados.map((item: ItemVencimientoConsolidado) => (
                    <div
                        key={item.id}
                        className={styles.filaItem}
                        style={{
                            gridTemplateColumns: '1.4fr 1.8fr 2.2fr 1.1fr 1.3fr 1.2fr',
                            borderLeft: item.estado === 'vencido' ? `4px solid ${COLOR_ESTADO.vencido}` : undefined,
                        }}
                    >
                        <div>
                            <span
                                className={styles.badge}
                                style={{
                                    fontSize: '0.75rem',
                                    backgroundColor: 'var(--badge-bg, #e2e8f0)',
                                    color: 'var(--text-h)',
                                }}
                            >
                                {ETIQUETA_CATEGORIA[item.categoria] || item.categoria_label}
                            </span>
                        </div>

                        <div style={{ fontWeight: '600', color: 'var(--text-h)' }}>
                            {item.titulo}
                        </div>

                        <div style={{ fontSize: '0.85rem' }}>
                            <div>{item.detalle}</div>
                            {item.referencia && (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                                    {item.referencia}
                                </div>
                            )}
                        </div>

                        <div style={{ fontSize: '0.9rem' }}>
                            {formatearFecha(item.fecha_vencimiento)}
                        </div>

                        <div>
                            <span
                                style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold',
                                    color: COLOR_ESTADO[item.estado],
                                }}
                            >
                                {ETIQUETA_ESTADO[item.estado]}
                            </span>
                        </div>

                        <div
                            style={{
                                fontSize: '0.85rem',
                                fontWeight: item.estado === 'vencido' ? 'bold' : 'normal',
                                color: item.estado === 'vencido' ? COLOR_ESTADO.vencido : 'inherit',
                            }}
                        >
                            {textoPlazo(item.dias_restantes)}
                        </div>

                        {/*
                          FUTURA EXTENSIÓN:
                          Aquí se podrá agregar una columna o menú de acciones rápidas para
                          navegar al formulario de renovación/recambio correspondiente
                          según item.categoria (ej: Ir a Renovar Documento o Registrar Recambio).
                        */}
                    </div>
                ))}

                {itemsPaginados.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        No se encontraron vencimientos con los filtros seleccionados.
                    </div>
                )}
            </div>

            {totalPaginas > 1 && (
                <div
                    className={styles.filaBotones}
                    style={{ alignItems: 'center', marginTop: '25px', justifyContent: 'center' }}
                >
                    <Boton
                        variant="volver"
                        onClick={() => setPaginaActual((p) => p - 1)}
                        disabled={paginaActual === 1}
                    >
                        Anterior
                    </Boton>

                    <span style={{ color: 'var(--text-h)', fontWeight: 'bold', margin: '0 15px' }}>
                        Página {paginaActual} de {totalPaginas}
                    </span>

                    <Boton
                        variant="siguiente"
                        onClick={() => setPaginaActual((p) => p + 1)}
                        disabled={paginaActual === totalPaginas}
                    >
                        Siguiente
                    </Boton>
                </div>
            )}
        </div>
    );
}
