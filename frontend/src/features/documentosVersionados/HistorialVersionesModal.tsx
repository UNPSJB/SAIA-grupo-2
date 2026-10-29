import React, { useEffect, useState } from 'react';
import type { VersionDocumento } from '../../types/documentosVersionados';
import { getHistorialVersiones, marcarVersionVigente } from '../../services/documentosVersionadosServices';
import { abrirArchivoEnPestania } from '../../utils/archivos';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import sharedStyles from '../../styles/shared.module.css';
import localStyles from './HistorialVersionesModal.module.css';

import TablaPaginada, { type Columna } from '../../components/TablaPaginada';

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
    // Estado del diálogo de confirmación
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

    //cambio de version vigente
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



    // Formateo legible de fecha
    const formatearFecha = (fechaStr?: string | null): string => {
        if (!fechaStr) return 'No especificada';
        try {
            // Si viene sólo la fecha YYYY-MM-DD
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

    // columnas para la tabla 
    const columnas: Columna<VersionDocumento>[] = [
        {
            key: 'version',
            encabezado: 'Versión',
            ordenable: true,
            render: (v) => (
                <>
                    <strong>v{v.version}</strong>
                    <span className={v.estado === 'activo' ? localStyles.badgeActivo : localStyles.badgeArchivado}>
                        {v.estado === 'activo' ? 'Vigente' : 'Archivada'}
                    </span>
                </>
            )
        },
        {
            key: 'fecha_vigencia',
            encabezado: 'Fecha de Vigencia',
            ordenable: true,
            render: (v) => formatearFecha(v.fecha_vigencia)
        },
        {
            key: 'fecha_subida',
            encabezado: 'Fecha de Subida',
            ordenable: true,
            render: (v) => formatearFecha(v.fecha_subida)
        },
        {
            key: 'subido_por',
            encabezado: 'Subido por',
            render: (v) => v.subido_por
                ? `${v.subido_por.nombre} ${v.subido_por.apellido} (${v.subido_por.legajo})`
                : 'Sistema'
        },
        {
            key: 'archivo_nombre',
            encabezado: 'Archivo',
            render: (v) => (
                <span title={v.archivo_nombre || ''}>
                    {v.archivo_nombre || `v${v.version}_documento.pdf`}
                </span>
            )
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones', 
            
            render: (v) => {
                const esActiva = v.estado === 'activo';
                return(
                <div className={sharedStyles.grupoBotonesTabla}>
                    <button
                        type="button"
                        className={`${localStyles.btnAccion} ${localStyles.btnVisualizar}`}
                        onClick={() => handleVisualizar(v)}
                        title="Visualizar documento en una pestaña nueva"
                    >
                        <i className="bi bi-eye"></i>
                        Visualizar
                    </button>

                    {isAdmin && !esActiva && (
                            <button
                                type="button"
                                className={`${localStyles.btnAccion} ${localStyles.btnVigente}`}
                                onClick={() => setVersionAConfirmar(v)}
                                title="Establecer esta versión como vigente"
                            >
                                <i className="bi bi-check2-circle"></i>
                                Establecer como vigente
                            </button>
                        )}
                </div>
                )
            }
        }
    ];




    return (
        <div className={sharedStyles.modalOverlay} onClick={onClose}>
            <div
                className={localStyles.modalContenedor}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-historial"
            >
                {/* Encabezado del Modal */}
                <div className={localStyles.encabezadoModal}>
                    <div>
                        <h2 id="titulo-historial" className={localStyles.tituloPrincipal}>
                            Historial de Versiones
                        </h2>
                        <p className={localStyles.subtitulo}>
                            Documento: <strong>{documentoNombre || `#${documentoId}`}</strong> (Solo lectura)
                        </p>
                    </div>
                </div>

                {/* Mensaje de error si falla la consulta (ej. permisos insuficientes 403) */}
                {error && (
                    <div className={localStyles.mensajeError}>
                        <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }}></i>
                        {error}
                    </div>
                )}

                {/* Indicador de carga */}
                {cargando && (
                    <div className={localStyles.mensajeEstado}>
                        <i className="bi bi-arrow-repeat" style={{ marginRight: '8px' }}></i>
                        Cargando historial de versiones...
                    </div>
                )}

                {/* Tabla de versiones (Estrictamente de solo lectura: sin botones de editar ni borrar) */}
                {!cargando && !error && versiones.length === 0 && (
                    <div className={localStyles.mensajeEstado}>
                        No hay versiones registradas para este documento.
                    </div>
                )}

                {!cargando && !error && versiones.length > 0 && (
                   <div className={localStyles.contenedorListado}>
                        <TablaPaginada
                            datos={versiones}
                            columnas={columnas}
                            gridTemplateColumns="0.9fr 1fr 1fr 1.5fr 1.5fr 2fr"
                            columnaOrdenInicial="fecha_vigencia"
                            ordenAscInicial={false}
                            itemsPorPagina={10} 
                        />
                    </div>
                )}

                {/* Pie del modal con botón de cierre */}
                <div className={localStyles.pieModal}>
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
                            La versión que estaba activa dejará de mostrarse como vigente.
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
