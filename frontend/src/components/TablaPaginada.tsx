import { useState, useMemo } from 'react';
import Boton from './Boton';
import sharedStyles from '../styles/shared.module.css';
import localStyles from './TablaPaginada.module.css';
import { exportarACSV } from '../utils/archivos';

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

    const columnasExportables = useMemo(() => {
        return columnas.filter(c =>
            c.key !== 'acciones' &&
            c.variant !== 'acciones' &&
            !c.encabezado.toLowerCase().includes('accion')
        );
    }, [columnas]);

    const encabezadosExportables = useMemo(() => {
        return columnasExportables.map(c => c.encabezado);
    }, [columnasExportables]);

    const filasExportables = useMemo(() => {
        return datosOrdenados.map(item => {
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
    }, [datosOrdenados, columnasExportables]);

    const handleDescargarCSV = () => {
        exportarACSV(tituloExportacion, encabezadosExportables, filasExportables);
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
                    <div className={sharedStyles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', width: '92%', textAlign: 'center', padding: '1.5rem' }}>
                        <h3 style={{ marginTop: 0, color: 'var(--text-h)', fontSize: '1.25rem' }}>
                            Vista Previa de Exportación CSV (Excel)
                        </h3>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Primeros registros que se incluirán en la descarga:
                        </p>

                        <div style={{ maxHeight: '280px', overflowY: 'auto', overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '1.25rem', background: 'var(--input-bg)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'var(--card-bg)', borderBottom: '2px solid var(--border)', color: 'var(--text-h)' }}>
                                        {encabezadosExportables.map((enc, idx) => (
                                            <th key={idx} style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{enc}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filasExportables.slice(0, 8).map((fila, idxFila) => (
                                        <tr key={idxFila} style={{ borderBottom: '1px solid var(--border)' }}>
                                            {fila.map((celda, idxCelda) => (
                                                <td key={idxCelda} style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                                                    {celda || '—'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0', textAlign: 'left' }}>
                            Total a exportar: <strong>{filasExportables.length}</strong> registros.
                        </p>

                        <div className={sharedStyles.filaBotones} style={{ justifyContent: 'flex-end', marginTop: 0 }}>
                            <Boton variant="descargar" onClick={handleDescargarCSV}>
                                Descargar CSV (Excel)
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
