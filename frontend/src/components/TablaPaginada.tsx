import { useState, useMemo } from 'react';
import Boton from './Boton';
import sharedStyles from '../styles/shared.module.css';
import localStyles from './TablaPaginada.module.css';
import { exportarACSV, exportarAPDF } from '../utils/archivos';

export interface Columna<T> {
    key: string;
    encabezado: string;
    ordenable?: boolean;
    render?: (item: T) => React.ReactNode; 
    valorOrdenamiento?: (item: T) => any;
    variant?: string | ((item: T) => string);
}

interface TablaPaginadaProps<T> {
    datos: T[];
    columnas: Columna<T>[];
    gridTemplateColumns: string; 
    itemsPorPagina?: number;
    mensajeVacio?: string;
    columnaOrdenInicial?: string;
    ordenAscInicial?: boolean;
    tituloExportacion?: string;
    permitirExportar?: boolean;
}

export default function TablaPaginada<T>({
    datos,
    columnas,
    gridTemplateColumns,
    itemsPorPagina = 10,
    mensajeVacio = "No hay registros para mostrar.",
    columnaOrdenInicial = '',
    ordenAscInicial = true,
    tituloExportacion = 'listado',
    permitirExportar = true
}: TablaPaginadaProps<T>) {
    
    const [paginaActual, setPaginaActual] = useState(1);
    const [columnaOrden, setColumnaOrden] = useState<string>(columnaOrdenInicial);
    const [ordenAsc, setOrdenAsc] = useState<boolean>(ordenAscInicial);
    const [modalExportar, setModalExportar] = useState(false); 

    const minWidthFila = useMemo(() => {
        return `${Math.max(450, columnas.length * 100)}px`;
    }, [columnas.length]);

    const handleSort = (columnaKey: string) => {
        if (columnaOrden === columnaKey) {
            setOrdenAsc(!ordenAsc);
        } else {
            setColumnaOrden(columnaKey);
            setOrdenAsc(true);
        }
    };

    const datosOrdenados = useMemo(() => {
        if (!columnaOrden) return datos;

        const columna = columnas.find(c => c.key === columnaOrden);
        if (!columna) return datos;

        return [...datos].sort((a, b) => {
            const valA = columna.valorOrdenamiento ? columna.valorOrdenamiento(a) : (a as any)[columnaOrden];
            const valB = columna.valorOrdenamiento ? columna.valorOrdenamiento(b) : (b as any)[columnaOrden];

            if (valA < valB) return ordenAsc ? -1 : 1;
            if (valA > valB) return ordenAsc ? 1 : -1;
            return 0;
        });
    }, [datos, columnaOrden, ordenAsc, columnas]);

    const totalPaginas = Math.ceil(datosOrdenados.length / itemsPorPagina) || 1;
    const indiceUltimo = paginaActual * itemsPorPagina;
    const indicePrimer = indiceUltimo - itemsPorPagina;
    
    const itemsPaginados = datosOrdenados.slice(indicePrimer, indiceUltimo);
    if (itemsPaginados.length === 0 && paginaActual > 1) {
        setPaginaActual(1);
    }

    function extraerTextoDeNodo(nodo: React.ReactNode): string {
        if (nodo === null || nodo === undefined || typeof nodo === 'boolean') {
            return '';
        }
        if (typeof nodo === 'string' || typeof nodo === 'number') {
            return String(nodo);
        }
        if (Array.isArray(nodo)) {
            return nodo.map(extraerTextoDeNodo).filter(Boolean).join(' ');
        }
        if (typeof nodo === 'object' && 'props' in nodo) {
            return extraerTextoDeNodo((nodo as any).props?.children);
        }
        return '';
    }

    const handleExportar = async (formato: 'csv' | 'pdf') => {
        const columnasExportables = columnas.filter(c =>
            c.key !== 'acciones' &&
            c.variant !== 'acciones' &&
            !c.encabezado.toLowerCase().includes('accion')
        );
        const encabezados = columnasExportables.map(c => c.encabezado);
        const filas = datosOrdenados.map(item => {
            return columnasExportables.map(col => {
                if (col.render) {
                    try {
                        const texto = extraerTextoDeNodo(col.render(item));
                        if (texto) return texto;
                    } catch {
                        // Fallback en caso de error
                    }
                }
                const valDirecto = (item as any)[col.key];
                if (valDirecto !== undefined && valDirecto !== null && typeof valDirecto !== 'object') {
                    return String(valDirecto);
                }
                return '';
            });
        });

        if (formato === 'csv') {
            exportarACSV(tituloExportacion, encabezados, filas);
        } else {
            await exportarAPDF(tituloExportacion, encabezados, filas);
        }
        setModalExportar(false);
    };

    return (
        <>
            <div className={sharedStyles.contenedorTabla}>
                {/* Cabecera */}
                <div className={sharedStyles.filaHeader} style={{ gridTemplateColumns, minWidth: minWidthFila }}>
                    {columnas.map((col) => (
                        <div 
                            key={col.key} 
                            onClick={() => col.ordenable && handleSort(col.key)}
                            style={{ cursor: col.ordenable ? 'pointer' : 'default', userSelect: 'none' }}
                        >
                            {col.encabezado} {col.ordenable && columnaOrden === col.key ? (ordenAsc ? '↑' : '↓') : ''}
                        </div>
                    ))}
                </div>

                {/* Filas */}
                {itemsPaginados.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {mensajeVacio}
                    </div>
                ) : (
                    itemsPaginados.map((item, index) => (
                        <div key={index} className={sharedStyles.filaItem} style={{ gridTemplateColumns, minWidth: minWidthFila }}>
                            {columnas.map((col) => {
                                const nombreVariante = typeof col.variant === 'function' ? col.variant(item) : col.variant;
                                
                                return (
                                    <div key={col.key} className={nombreVariante ? localStyles[nombreVariante] : ''}>
                                        {col.render ? col.render(item) : String((item as any)[col.key] || '')}
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>

            {datos.length > 0 && (
                <div className={localStyles.pieTabla}>
                    <div></div>
                    <div>
                        {totalPaginas > 1 && (
                            <div className={localStyles.paginacionCentrada}>
                                <Boton variant="volver" onClick={() => setPaginaActual(p => p - 1)} disabled={paginaActual === 1}>
                                    Anterior
                                </Boton>
                                <span className={localStyles.textoPagina}>
                                    Página {paginaActual} de {totalPaginas}
                                </span>
                                <Boton variant="siguiente" onClick={() => setPaginaActual(p => p + 1)} disabled={paginaActual === totalPaginas}>
                                    Siguiente
                                </Boton>
                            </div>
                        )}
                    </div>
                    <div className={localStyles.botonExportarDerecha}>
                        {permitirExportar && (
                            <Boton variant="documentos" onClick={() => setModalExportar(true)}>
                                Exportar
                            </Boton>
                        )}
                    </div>
                </div>
            )}

            {modalExportar && (
                <div className={sharedStyles.modalOverlay} onClick={() => setModalExportar(false)}>
                    <div className={sharedStyles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
                        <h3>Exportar Listado</h3>
                        <p>Elegí en qué formato querés descargar los registros:</p>

                        <div className={sharedStyles.filaBotones} style={{ justifyContent: 'center', marginTop: '20px' }}>
                            <Boton variant="documentos" onClick={() => handleExportar('csv')}>
                                CSV (Excel)
                            </Boton>
                            <Boton variant="documentos" onClick={() => handleExportar('pdf')}>
                                PDF (Imprimir)
                            </Boton>
                            <Boton variant="volver" onClick={() => setModalExportar(false)}>
                                Cancelar
                            </Boton>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
