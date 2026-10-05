import { useEffect, useState } from 'react';
import type { AlertaVencimiento } from '../../types/documentacion';
import type { Empleado } from '../../types/empleados';
import { getAlertasDocumentacion } from '../../services/documentacionServices';
import { getEmpleados } from '../../services/empleadosServices';
import {
    COLOR_ESTADO,
    ETIQUETA_ESTADO,
    ETIQUETA_TIPO,
    formatearFecha,
    textoVencimiento,
} from '../documentacion/estadoVencimiento';
import styles from '../../styles/shared.module.css';

export default function VencimientosList() {
    const [vencimientos, setVencimientos] = useState<AlertaVencimiento[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);

    const [empleadoId, setEmpleadoId] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

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
    };

    const vencidos = vencimientos.filter(
        (v) => v.estado === 'vencido'
    ).length;

    const proximos = vencimientos.filter(
        (v) => v.estado === 'proximo'
    ).length;

    const vigentes = vencimientos.filter(
        (v) => v.estado === 'vigente'
    ).length;

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Vencimientos de Personal</h2>

            <p style={{ marginTop: '-10px', marginBottom: '20px' }}>
                <span
                    style={{
                        color: COLOR_ESTADO.vencido,
                        fontWeight: 'bold',
                    }}
                >
                    {vencidos} vencidos
                </span>
                {' · '}
                <span
                    style={{
                        color: COLOR_ESTADO.proximo,
                        fontWeight: 'bold',
                    }}
                >
                    {proximos} próximos
                </span>
                {' · '}
                <span
                    style={{
                        color: COLOR_ESTADO.vigente,
                        fontWeight: 'bold',
                    }}
                >
                    {vigentes} vigentes
                </span>
            </p>

            <div className={styles.formularioTarjeta}>
                <div>
                    <label htmlFor="empleado">Persona</label>
                    <select
                        id="empleado"
                        value={empleadoId}
                        onChange={(e) => setEmpleadoId(e.target.value)}
                    >
                        <option value="">Todas las personas</option>

                        {empleados.map((empleado) => (
                            <option
                                key={empleado.id}
                                value={empleado.id}
                            >
                                {empleado.apellido}, {empleado.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="fechaDesde">Vencimiento desde</label>
                    <input
                        id="fechaDesde"
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => setFechaDesde(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="fechaHasta">Vencimiento hasta</label>
                    <input
                        id="fechaHasta"
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => setFechaHasta(e.target.value)}
                    />
                </div>

                <div className={styles.filaBotones}>
                    <button
                        type="button"
                        onClick={limpiarFiltros}
                    >
                        Limpiar filtros
                    </button>
                </div>
            </div>

            {error && (
                <p style={{ color: '#ef4444', marginTop: '15px' }}>
                    {error}
                </p>
            )}

            <div
                className={styles.contenedorTabla}
                style={{ maxWidth: '1000px' }}
            >
                <div
                    className={styles.filaHeader}
                    style={{
                        gridTemplateColumns:
                            '1.8fr 1.5fr 2fr 1.3fr 1.4fr 1.4fr',
                    }}
                >
                    <div>Persona</div>
                    <div>Tipo</div>
                    <div>Detalle</div>
                    <div>Vencimiento</div>
                    <div>Estado</div>
                    <div>Plazo</div>
                </div>

                {vencimientos.map((vencimiento) => (
                    <div
                        key={vencimiento.id}
                        className={styles.filaItem}
                        style={{
                            gridTemplateColumns:
                                '1.8fr 1.5fr 2fr 1.3fr 1.4fr 1.4fr',
                        }}
                    >
                        <div
                            style={{
                                fontWeight: '500',
                                color: 'var(--text-h)',
                            }}
                        >
                            {vencimiento.empleado.apellido},{' '}
                            {vencimiento.empleado.nombre}
                        </div>

                        <div>
                            {ETIQUETA_TIPO[vencimiento.tipo]}
                        </div>

                        <div>
                            {vencimiento.descripcion}
                        </div>

                        <div>
                            {formatearFecha(
                                vencimiento.fecha_vencimiento
                            )}
                        </div>

                        <div>
                            <span
                                className={styles.badge}
                                style={{
                                    backgroundColor:
                                        COLOR_ESTADO[vencimiento.estado],
                                    color: 'white',
                                }}
                            >
                                {ETIQUETA_ESTADO[vencimiento.estado]}
                            </span>
                        </div>

                        <div>
                            {textoVencimiento(
                                vencimiento.dias_restantes
                            )}
                        </div>
                    </div>
                ))}

                {!cargando && vencimientos.length === 0 && (
                    <div
                        style={{
                            padding: '30px',
                            textAlign: 'center',
                            color: 'var(--text)',
                        }}
                    >
                        No se encontraron vencimientos con los filtros
                        seleccionados.
                    </div>
                )}

                {cargando && (
                    <div
                        style={{
                            padding: '30px',
                            textAlign: 'center',
                            color: 'var(--text)',
                        }}
                    >
                        Cargando vencimientos...
                    </div>
                )}
            </div>
        </div>
    );
}