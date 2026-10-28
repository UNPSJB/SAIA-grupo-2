
import React, { useEffect, useState, useMemo } from 'react';
import type { DocumentoVersionado } from '../../types/documentosVersionados';
import { getDocumentosVersionados } from '../../services/documentosVersionadosServices';
import BotonHistorialVersiones from './BotonHistorialVersiones';
import HistorialVersionesModal from './HistorialVersionesModal';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';
import sharedStyles from '../../styles/shared.module.css';

// Etiquetas descriptivas para los tipos de documentos
const ETIQUETAS_TIPO: Record<string, string> = {
    manual_bpm: 'Manual de BPM',
    ficha_tecnica: 'Ficha Técnica',
    procedimiento: 'Procedimiento',
    receta: 'Receta',
};

export default function DocumentosVersionadosList() {
    const [documentos, setDocumentos] = useState<DocumentoVersionado[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState<string>('');

    // Estado para selector rápido de testing
    const [docSeleccionadoId, setDocSeleccionadoId] = useState<number | ''>('');
    const [modalTestAbierto, setModalTestAbierto] = useState<boolean>(false);

    useEffect(() => {
        const cargarDocumentos = async () => {
            setCargando(true);
            setError(null);
            try {
                const data = await getDocumentosVersionados();
                setDocumentos(data);
            } catch (err: any) {
                setError(err?.message || 'Error al cargar los documentos versionados.');
            } finally {
                setCargando(false);
            }
        };

        cargarDocumentos();
    }, []);

    // Filtrado por buscador de texto
    const documentosFiltrados = useMemo(() => {
        return filtrarPorTexto(documentos, busqueda);
    }, [documentos, busqueda]);

    // Documento seleccionado para el modal directo de testing
    const docSeleccionado = useMemo(() => {
        if (!docSeleccionadoId) return null;
        return documentos.find((d) => d.id === Number(docSeleccionadoId)) || null;
    }, [documentos, docSeleccionadoId]);

    // Columnas para la tabla estandarizada
    const columnas: Columna<DocumentoVersionado>[] = [
        {
            key: 'id',
            encabezado: 'ID',
            ordenable: true,
            render: (doc) => <span>#{doc.id}</span>,
        },
        {
            key: 'nombre',
            encabezado: 'Nombre del Documento',
            ordenable: true,
            render: (doc) => <strong>{doc.nombre}</strong>,
        },
        {
            key: 'tipo',
            encabezado: 'Tipo',
            ordenable: true,
            render: (doc) => <span>{ETIQUETAS_TIPO[doc.tipo] || doc.tipo}</span>,
        },
        {
            key: 'version_vigente',
            encabezado: 'Versión Vigente Actual',
            render: (doc) => {
                if (!doc.version_vigente) {
                    return <span style={{ color: 'var(--text-muted)' }}>Sin versión activa</span>;
                }
                const v = doc.version_vigente;
                return (
                    <div>
                        <span style={{ fontWeight: 600, color: '#15803d' }}>v{v.version} (Activa)</span>
                        {v.fecha_vigencia && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Vigente desde: {v.fecha_vigencia}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'acciones',
            encabezado: 'Historial',
            render: (doc) => (
                <BotonHistorialVersiones
                    documentoId={doc.id}
                    documentoNombre={doc.nombre}
                    texto="Ver Versiones"
                />
            ),
        },
    ];

    return (
        <div className={sharedStyles.contenedorGeneral}>
            <div className={sharedStyles.cabeceraLista}>
                <div>
                    <h1 className={sharedStyles.tituloPrincipal}>Documentos Versionados</h1>
                    <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                        Vista de verificación y testing del historial de versiones (Solo administradores)
                    </p>
                </div>
            </div>
            <div
                style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '260px' }}>
                        <label
                            htmlFor="selector-testing-doc"
                            style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.9rem' }}
                        >
                            <i className="bi bi-tools" style={{ marginRight: '6px' }}></i>
                            Selector para pruebas de testing:
                        </label>
                        <select
                            id="selector-testing-doc"
                            value={docSeleccionadoId}
                            onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : '';
                                setDocSeleccionadoId(val);
                            }}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg)',
                                color: 'var(--text)',
                            }}
                        >
                            <option value="">-- Seleccionar documento para probar historial --</option>
                            {documentos.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                    #{doc.id} - {doc.nombre} ({ETIQUETAS_TIPO[doc.tipo] || doc.tipo})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ paddingTop: '22px' }}>
                        <button
                            type="button"
                            disabled={!docSeleccionadoId}
                            onClick={() => setModalTestAbierto(true)}
                            className={sharedStyles.btnPrimary}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                backgroundColor: !docSeleccionadoId ? 'var(--text-muted)' : '#2563eb',
                                color: 'white',
                                border: 'none',
                                cursor: !docSeleccionadoId ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <i className="bi bi-clock-history"></i>
                            Abrir Historial de Versiones
                        </button>
                    </div>
                </div>
            </div>

            {/* Buscador de documentos */}
            <div style={{ marginBottom: '16px' }}>
                <BuscadorTexto
                    valor={busqueda}
                    alCambiar={setBusqueda}
                    placeholder="Buscar por nombre o tipo de documento..."
                />
            </div>

            {/* Error o Spinner */}
            {error && (
                <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px' }}>
                    {error}
                </div>
            )}

            {/* Tabla paginada con documentos */}
            {cargando ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Cargando documentos...
                </div>
            ) : (
                <TablaPaginada
                    datos={documentosFiltrados}
                    columnas={columnas}
                    gridTemplateColumns="80px 2fr 1.5fr 1.5fr 160px"
                    itemsPorPagina={8}
                    mensajeVacio="No se encontraron documentos versionados."
                />
            )}

            {/* Modal para el selector de testing */}
            {modalTestAbierto && docSeleccionado && (
                <HistorialVersionesModal
                    documentoId={docSeleccionado.id}
                    documentoNombre={docSeleccionado.nombre}
                    onClose={() => setModalTestAbierto(false)}
                />
            )}
        </div>
    );
}
