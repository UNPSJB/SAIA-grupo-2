import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { CumplimientoEmpleado, Documentacion } from '../../types/documentacion';
import type { Empleado } from '../../types/empleados';
import {
    getCumplimiento,
    getDocumentacion,
    deleteDocumentacion,
} from '../../services/documentacionServices';
import { getEmpleadoById } from '../../services/empleadosServices';
import {
    COLOR_ESTADO,
    ETIQUETA_ESTADO,
    ETIQUETA_TIPO,
    formatearFecha,
    textoVencimiento,
} from './estadoVencimiento';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function DocumentacionEmpleado() {
    const { empleadoId } = useParams();

    const [empleado, setEmpleado] = useState<Empleado | null>(null);
    const [documentos, setDocumentos] = useState<Documentacion[]>([]);
    const [cumplimiento, setCumplimiento] = useState<CumplimientoEmpleado | null>(null);
    const [cargando, setCargando] = useState(true);

    const cargarDatos = async () => {
        if (!empleadoId) return;
        try {
            const [datosEmpleado, datosDocumentos, datosCumplimiento] = await Promise.all([
                getEmpleadoById(empleadoId),
                getDocumentacion(Number(empleadoId)),
                getCumplimiento(Number(empleadoId)),
            ]);
            setEmpleado(datosEmpleado);
            setDocumentos(datosDocumentos);
            setCumplimiento(datosCumplimiento);
        } catch (error) {
            console.error('Error al cargar la documentación del empleado:', error);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [empleadoId]);

    const handleEliminar = async (documento: Documentacion) => {
        const confirmado = window.confirm(
            `¿Eliminar el documento "${ETIQUETA_TIPO[documento.tipo]}"?`
        );
        if (!confirmado) return;

        const exito = await deleteDocumentacion(String(documento.id));
        if (exito) {
            cargarDatos();
        } else {
            alert('Hubo un error al eliminar el documento.');
        }
    };

    const detalle = (documento: Documentacion): string => {
        if (documento.tipo === 'libreta_sanitaria') {
            return `N° ${documento.numero_carnet} — ${documento.autoridad_emisora}`;
        }
        if (documento.tipo === 'capacitacion') {
            return documento.titulo ?? '';
        }
        return `Dr/a. ${documento.nombre_medico} — Mat. ${documento.matricula}`;
    };

    if (cargando) {
        return (
            <div className={styles.contenedorPrincipal}>
                <h2>Documentación del Empleado</h2>
                <p>Cargando...</p>
            </div>
        );
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Documentación del Empleado</h2>

            {empleado && (
                <p style={{ marginTop: '-10px', marginBottom: '20px', fontSize: '1.05rem' }}>
                    <strong>{empleado.legajo}</strong> — {empleado.nombre} {empleado.apellido}
                </p>
            )}

            {cumplimiento && !cumplimiento.completo && (
                <div
                    className={styles.tarjetaEstatica}
                    style={{
                        maxWidth: '900px',
                        width: '100%',
                        marginBottom: '20px',
                        borderLeft: `4px solid ${COLOR_ESTADO.vencido}`,
                    }}
                >
                    <strong style={{ color: COLOR_ESTADO.vencido }}>
                        Documentación incompleta
                    </strong>
                    {cumplimiento.faltantes.length > 0 && (
                        <p style={{ margin: '8px 0 0 0' }}>
                            Falta cargar: {cumplimiento.faltantes.map((t) => ETIQUETA_TIPO[t]).join(', ')}
                        </p>
                    )}
                    {cumplimiento.vencidos.length > 0 && (
                        <p style={{ margin: '8px 0 0 0' }}>
                            Vencidos: {cumplimiento.vencidos.map((t) => ETIQUETA_TIPO[t]).join(', ')}
                        </p>
                    )}
                </div>
            )}

            {cumplimiento && cumplimiento.completo && (
                <p style={{ marginTop: '-10px', marginBottom: '20px', color: COLOR_ESTADO.vigente, fontWeight: 'bold' }}>
                    Documentación obligatoria al día
                </p>
            )}

            <div className={styles.filaBotones} style={{ marginBottom: '20px' }}>
                <Link to={`/empleados/${empleadoId}/documentacion/nuevo`}>
                    <Boton variant="crear">Cargar Documento</Boton>
                </Link>
                <Link to="/empleados">
                    <Boton variant="volver">Volver al directorio</Boton>
                </Link>
            </div>

            <div className={styles.contenedorTabla} style={{ maxWidth: '1000px' }}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '1.5fr 2fr 1.2fr 1.4fr 1.3fr 1.2fr' }}>
                    <div>Tipo</div>
                    <div>Detalle</div>
                    <div>Vencimiento</div>
                    <div>Estado</div>
                    <div>Plazo</div>
                    <div>Acciones</div>
                </div>

                {documentos.map((documento) => (
                    <div
                        key={documento.id}
                        className={styles.filaItem}
                        style={{ gridTemplateColumns: '1.5fr 2fr 1.2fr 1.4fr 1.3fr 1.2fr' }}
                    >
                        <div style={{ fontWeight: '500', color: 'var(--text-h)' }}>
                            {ETIQUETA_TIPO[documento.tipo]}
                        </div>

                        <div style={{ fontSize: '0.85rem' }}>{detalle(documento)}</div>

                        <div>{formatearFecha(documento.fecha_vencimiento)}</div>

                        <div>
                            <span
                                className={styles.badge}
                                style={{
                                    fontSize: '0.75rem',
                                    padding: '3px 10px',
                                    backgroundColor: COLOR_ESTADO[documento.estado],
                                    color: '#ffffff',
                                }}
                            >
                                {ETIQUETA_ESTADO[documento.estado]}
                            </span>
                        </div>

                        <div style={{ fontSize: '0.85rem' }}>
                            {textoVencimiento(documento.dias_restantes)}
                        </div>

                        <div className={styles.grupoBotonesTabla}>
                            <Link
                                to={`/empleados/${empleadoId}/documentacion/editar/${documento.id}`}
                                title="Renovar o editar"
                            >
                                <Boton variant="editar" style={{ padding: '8px 12px' }}></Boton>
                            </Link>
                            <Boton
                                variant="eliminar"
                                style={{ padding: '8px 12px' }}
                                onClick={() => handleEliminar(documento)}
                                title="Eliminar documento"
                            ></Boton>
                        </div>
                    </div>
                ))}

                {documentos.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text)' }}>
                        Este empleado no tiene documentación cargada.
                    </div>
                )}
            </div>
        </div>
    );
}
