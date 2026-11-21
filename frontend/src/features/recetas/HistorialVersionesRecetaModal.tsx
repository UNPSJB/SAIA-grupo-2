import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Boton from '../../components/Boton';
import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import { getEmpleados } from '../../services/empleadosServices';
import { getVersionesReceta } from '../../services/recetasServices';
import type { Empleado } from '../../types/empleados';
import type { VersionReceta } from '../../types/receta';
import sharedStyles from '../../styles/shared.module.css';

interface HistorialVersionesRecetaModalProps {
    recetaId: number;
    recetaNombre: string;
    onClose: () => void;
}

function formatearFecha(fecha: string | null): string {
    if (!fecha) return 'Sin especificar';
    const partes = fecha.slice(0, 10).split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fecha;
}

export default function HistorialVersionesRecetaModal({
    recetaId,
    recetaNombre,
    onClose,
}: HistorialVersionesRecetaModalProps) {
    const [versiones, setVersiones] = useState<VersionReceta[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelado = false;

        const cargarHistorial = async () => {
            setCargando(true);
            setError(null);

            try {
                const [versionesData, empleadosData] = await Promise.all([
                    getVersionesReceta(recetaId),
                    getEmpleados(),
                ]);

                if (!cancelado) {
                    setVersiones(versionesData);
                    setEmpleados(empleadosData);
                }
            } catch (problema) {
                if (!cancelado) {
                    setError(
                        problema instanceof Error
                            ? problema.message
                            : 'No se pudo cargar el historial de versiones de la receta.',
                    );
                }
            } finally {
                if (!cancelado) {
                    setCargando(false);
                }
            }
        };

        void cargarHistorial();

        return () => {
            cancelado = true;
        };
    }, [recetaId]);

    const empleadosPorId = new Map(empleados.map((empleado) => [empleado.id, empleado]));

    const columnas: Columna<VersionReceta>[] = [
        {
            key: 'version',
            encabezado: 'Versión',
            ordenable: true,
            valorOrdenamiento: (version) => version.version,
            variant: 'titulo',
            render: (version) => `v${version.version}`,
        },
        {
            key: 'estado',
            encabezado: 'Estado',
            ordenable: true,
            valorOrdenamiento: (version) => version.estado,
            variant: (version) => version.estado === 'activo' ? 'activo' : 'muted',
            render: (version) => version.estado === 'activo' ? 'Vigente' : 'Archivada',
        },
        {
            key: 'fecha_vigencia',
            encabezado: 'Fecha de vigencia',
            ordenable: true,
            valorOrdenamiento: (version) => version.fecha_vigencia ?? '',
            render: (version) => formatearFecha(version.fecha_vigencia),
        },
        {
            key: 'motivo_cambio',
            encabezado: 'Motivo de cambio',
            ordenable: true,
            valorOrdenamiento: (version) => version.motivo_cambio ?? '',
            render: (version) => version.motivo_cambio || '—',
        },
        {
            key: 'subido_por',
            encabezado: 'Subido por',
            ordenable: true,
            valorOrdenamiento: (version) => {
                const empleado = version.creado_por_id
                    ? empleadosPorId.get(version.creado_por_id)
                    : null;
                return empleado ? `${empleado.nombre} ${empleado.apellido}` : '';
            },
            render: (version) => {
                if (!version.creado_por_id) return 'Sistema';
                const empleado = empleadosPorId.get(version.creado_por_id);
                return empleado
                    ? `${empleado.nombre} ${empleado.apellido} (${empleado.legajo})`
                    : `Empleado #${version.creado_por_id}`;
            },
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            variant: 'acciones',
            render: (version) => (
                <Link
                    to={`/recetas/${recetaId}?version=${version.version}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Boton
                        variant="ver"
                        title={`Visualizar la versión v${version.version} en una nueva ventana`}
                    >
                        Visualizar
                    </Boton>
                </Link>
            ),
        },
    ];

    return (
        <div className={sharedStyles.modalOverlay} onClick={onClose}>
            <div
                className={sharedStyles.modalFormulario}
                style={{ maxWidth: '1000px' }}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-historial-receta"
            >
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '15px', marginBottom: '20px' }}>
                    <h2 id="titulo-historial-receta" style={{ margin: 0, color: 'var(--text-h)' }}>
                        Historial de versiones de receta
                    </h2>
                    <p className={sharedStyles.textMuted} style={{ margin: '6px 0 0' }}>
                        Receta: <strong>{recetaNombre}</strong> (Solo lectura)
                    </p>
                </div>

                {error && (
                    <p className={sharedStyles.textDanger} role="alert">
                        {error}
                    </p>
                )}

                {cargando && (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        Cargando historial de versiones...
                    </div>
                )}

                {!cargando && !error && versiones.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No hay versiones registradas para esta receta.
                    </div>
                )}

                {!cargando && !error && versiones.length > 0 && (
                    <>
                        <div style={{ width: '100%', marginBottom: '20px' }}>
                            <TablaPaginada
                                datos={versiones}
                                columnas={columnas}
                                gridTemplateColumns="0.7fr 0.9fr 1.2fr 1.8fr 1.6fr 1.4fr"
                                columnaOrdenInicial="version"
                                ordenAscInicial={false}
                                itemsPorPagina={8}
                                tituloExportacion={`Historial de versiones de ${recetaNombre}`}
                            />
                        </div>
                    </>
                )}

                <div className={sharedStyles.filaBotones}>
                    <Boton variant="volver" onClick={onClose}>
                        Cerrar
                    </Boton>
                </div>
            </div>
        </div>
    );
}
