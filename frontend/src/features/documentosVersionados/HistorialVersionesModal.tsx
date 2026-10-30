import { useEffect, useState } from 'react';
import type { VersionDocumento } from '../../types/documentosVersionados';
import { getHistorialVersiones, marcarVersionVigente } from '../../services/documentosVersionadosServices';
import { abrirArchivoEnPestania } from '../../utils/archivos';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import sharedStyles from '../../styles/shared.module.css';

interface HistorialVersionesModalProps {
    documentoId: number;
    documentoNombre?: string;
    onClose: () => void;
    onVersionVigenteCambiada?: () => void;
}

export default function HistorialVersionesModal({
    documentoId,
    documentoNombre,
    onClose,
    onVersionVigenteCambiada,
}: HistorialVersionesModalProps) {
    const { usuario } = useAuth();
    const isAdmin = usuario?.rol === 'admin';
    const [versiones, setVersiones] = useState<VersionDocumento[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Estado del diálogo de confirmación para cambiar versión vigente
    const [versionAConfirmar, setVersionAConfirmar] = useState<VersionDocumento | null>(null);
    const [guardando, setGuardando] = useState<boolean>(false);

    const cargarVersiones = async () => {
        setCargando(true);
        setError(null);
        try {
            const data = await getHistorialVersiones(documentoId);
            setVersiones(data);
        } catch (err: any) {
            setError(err?.message || 'Error al cargar el historial de versiones.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarVersiones();
    }, [documentoId]);

    const handleVisualizar = (version: VersionDocumento) => {
        if (!version.version_documento_url) return;
        abrirArchivoEnPestania(version.version_documento_url, version.archivo_nombre);
    };

    const handleConfirmarVigencia = async () => {
        if (!versionAConfirmar) return;
        setGuardando(true);
        try {
            await marcarVersionVigente(documentoId, versionAConfirmar.version);
            setVersionAConfirmar(null);
            await cargarVersiones(); // Refresca la tabla del modal
            if (onVersionVigenteCambiada) {
                onVersionVigenteCambiada(); // Refresca la tabla principal
            }
        } catch (err: any) {
            setError(err?.message || 'Error al cambiar la versión vigente.');
            setVersionAConfirmar(null);
        } finally {
            setGuardando(false);
        }
    };

    const formatearFecha = (fechaStr?: string | null): string => {
        if (!fechaStr) return 'No especificada';
        try {
            if (fechaStr.length === 10) {
                const [anio, mes, dia] = fechaStr.split('-');
                return `${dia}/${mes}/${anio}`;
            }
            const fecha = new Date(fechaStr);
            return isNaN(fecha.getTime()) ? fechaStr : fecha.toLocaleDateString('es-AR');
        } catch {
            return fechaStr;
        }
    };

    const columnas: Columna<VersionDocumento>[] = [
        {
            key: 'version',
            encabezado: 'Versión',
            ordenable: true,
            variant: 'titulo', 
            render: (v) => `v${v.version}`,
        },
        {
            key: 'estado',
            encabezado: 'Estado',
            ordenable: true,
            variant: (v) => (v.estado === 'activo' ? 'activo' : 'muted'),
            render: (v) => (v.estado === 'activo' ? 'Vigente' : 'Archivada'),
        },
        {
            key: 'fecha_vigencia',
            encabezado: 'Fecha de Vigencia',
            ordenable: true,
            variant: 'fecha', 
            render: (v) => formatearFecha(v.fecha_vigencia),
        },
        {
            key: 'fecha_subida',
            encabezado: 'Fecha de Subida',
            ordenable: true,
            variant: 'fecha', 
            render: (v) => formatearFecha(v.fecha_subida),
        },
        {
            key: 'subido_por',
            encabezado: 'Subido por',
            render: (v) =>
                v.subido_por
                    ? `${v.subido_por.nombre} ${v.subido_por.apellido} (${v.subido_por.legajo})`
                    : 'Sistema',
        },
        {
            key: 'archivo_nombre',
            encabezado: 'Archivo',
            variant: 'muted', 
            render: (v) => v.archivo_nombre || `v${v.version}_documento.pdf`,
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones', 
            render: (v) => {
                const esActiva = v.estado === 'activo';
                return (
                    <>
                        <Boton
                            variant="ver"
                            onClick={() => handleVisualizar(v)}
                            title="Visualizar documento en una pestaña nueva"
                        >
                            Visualizar
                        </Boton>

                        {isAdmin && !esActiva && (
                            <Boton
                                variant="guardar"
                                onClick={() => setVersionAConfirmar(v)}
                                title="Establecer esta versión como vigente"
                            >
                                Vigente
                            </Boton>
                        )}
                    </>
                );
            },
        },
    ];

    return (
        <div className={sharedStyles.modalOverlay} onClick={onClose}>
            <div
                className={sharedStyles.modalFormulario}
                style={{ maxWidth: '950px' }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-historial"
            >
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '15px', marginBottom: '20px' }}>
                    <h2 id="titulo-historial" style={{ margin: 0, color: 'var(--text-h)' }}>
                        Historial de Versiones
                    </h2>
                    <p className={sharedStyles.textMuted} style={{ margin: '6px 0 0 0' }}>
                        Documento: <strong>{documentoNombre || `#${documentoId}`}</strong> (Solo lectura)
                    </p>
                </div>

                {error && (
                    <div className={sharedStyles.textDanger} style={{ marginBottom: '16px' }}>
                        <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }}></i>
                        {error}
                    </div>
                )}

                {cargando && (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        Cargando historial de versiones...
                    </div>
                )}

                {!cargando && !error && versiones.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No hay versiones registradas para este documento.
                    </div>
                )}

                {!cargando && !error && versiones.length > 0 && (
                    <div style={{ width: '100%', marginBottom: '20px' }}>
                        <TablaPaginada
                            datos={versiones}
                            columnas={columnas}
                            gridTemplateColumns="0.8fr 1fr 1.2fr 1.2fr 1.5fr 1.5fr 3fr"
                            columnaOrdenInicial="fecha_vigencia"
                            ordenAscInicial={false}
                            itemsPorPagina={8}
                        />
                    </div>
                )}

                <div className={sharedStyles.filaBotones}>
                    <Boton variant="volver" onClick={onClose}>
                        Cerrar
                    </Boton>
                </div>
            </div>

            {versionAConfirmar && (
                <div className={sharedStyles.modalOverlay} onClick={() => setVersionAConfirmar(null)}>
                    <div className={sharedStyles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3>Confirmar Cambio de Vigencia</h3>
                        <p>
                            ¿Desea establecer la <strong>versión v{versionAConfirmar.version}</strong> como la versión vigente de este documento?
                            La versión activa actual pasará a estar archivada.
                        </p>
                        <div className={sharedStyles.filaBotones}>
                            <Boton
                                variant="volver"
                                onClick={() => setVersionAConfirmar(null)}
                                disabled={guardando}
                            >
                                Cancelar
                            </Boton>
                            <Boton
                                variant="guardar"
                                onClick={handleConfirmarVigencia}
                                disabled={guardando}
                            >
                                {guardando ? 'Guardando...' : 'Confirmar'}
                            </Boton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}