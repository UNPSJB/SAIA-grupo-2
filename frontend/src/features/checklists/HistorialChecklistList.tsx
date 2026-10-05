import { useState, useEffect } from 'react';
import type { HistorialChecklistResumen, RegistroChecklistDetalle } from '../../types/checklists';
import type { Sector } from '../../types/sectores';
import { getHistorialChecklists, getDetalleTareaRealizada } from '../../services/checklistsServices';
import { getSectores } from '../../services/sectoresServices';
import { getProductos } from '../../services/productosLimpiezaServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function HistorialChecklistList() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hoyLocal = `${year}-${month}-${day}`;

    // Primero del mes actual siempre
    const primeroDelMesLocal = `${year}-${month}-01`;

    const [fechaInicio, setFechaInicio] = useState(primeroDelMesLocal);
    const [fechaFin, setFechaFin] = useState(hoyLocal);
    const [sectorFiltro, setSectorFiltro] = useState('todos');

    const [errorFechaInicio, setErrorFechaInicio] = useState('');
    const [errorFechaFin, setErrorFechaFin] = useState('');
    const [fechaInicioInvalida, setFechaInicioInvalida] = useState(false);
    const [fechaFinInvalida, setFechaFinInvalida] = useState(false);

    const [sectores, setSectores] = useState<Sector[]>([]);
    const [historial, setHistorial] = useState<HistorialChecklistResumen | null>(null);
    const [cargando, setCargando] = useState(true);

    const [paginaActual, setPaginaActual] = useState(1);
    const registrosPorPagina = 5;

    const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
    const [detalleTarea, setDetalleTarea] = useState<RegistroChecklistDetalle | null>(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [productosList, setProductosList] = useState<any[]>([]);

    useEffect(() => {
        const cargarSectores = async () => {
            try {
                const data = await getSectores();
                setSectores(data);
            } catch (error) {
                console.error("Error al cargar sectores:", error);
            }
        };
        cargarSectores();
    }, []);

    const cargarHistorial = async () => {
        setCargando(true);
        try {
            const data = await getHistorialChecklists(fechaInicio, fechaFin, sectorFiltro);
            setHistorial(data);
            setPaginaActual(1);
        } catch (error) {
            console.error("Error al cargar historial:", error);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarHistorial();
    }, []);

    const handleFiltrar = (e: React.FormEvent) => {
        e.preventDefault();
        let hayError = false;

        if (fechaInicioInvalida) {
            setErrorFechaInicio('La fecha ingresada no existe en el calendario.');
            hayError = true;
        } else if (!fechaInicio) {
            setErrorFechaInicio('Debe ingresar una fecha de inicio.');
            hayError = true;
        } else {
            setErrorFechaInicio('');
        }

        if (fechaFinInvalida) {
            setErrorFechaFin('La fecha ingresada no existe en el calendario.');
            hayError = true;
        } else if (!fechaFin) {
            setErrorFechaFin('Debe ingresar una fecha de fin.');
            hayError = true;
        } else if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
            setErrorFechaFin('La fecha de fin no puede ser anterior a la de inicio.');
            hayError = true;
        } else {
            setErrorFechaFin('');
        }

        if (hayError) return;

        cargarHistorial();
    };

    const abrirDetalleTarea = async (tarea_id: number, plan_id?: number | null) => {
        setModalDetalleAbierto(true);
        setCargandoDetalle(true);
        try {
            const [data, productosData] = await Promise.all([
                getDetalleTareaRealizada(tarea_id, plan_id || 0),
                productosList.length > 0 ? Promise.resolve(productosList) : getProductos()
            ]);
            setProductosList(productosData);
            setDetalleTarea(data);
        } catch (error) {
            console.error("Error al obtener detalle de la tarea:", error);
        } finally {
            setCargandoDetalle(false);
        }
    };

    const registros = historial?.registros || [];
    const indiceUltimo = paginaActual * registrosPorPagina;
    const indicePrimer = indiceUltimo - registrosPorPagina;
    const registrosActuales = registros.slice(indicePrimer, indiceUltimo);
    const totalPaginas = Math.ceil(registros.length / registrosPorPagina);

    const pct = historial?.porcentaje_cumplimiento ?? 100;
    const colorPct = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Historial y Auditoría de Checklists</h2>
            <p className={styles.textMuted} style={{ marginBottom: '20px' }}>
                Consulta histórica de cumplimiento
            </p>

            {/* FORMULARIO DE FILTROS */}
            <form onSubmit={handleFiltrar} noValidate style={{ backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', width: '100%', maxWidth: '1100px', marginBottom: '30px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'flex-start' }}>
                    <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label style={{ fontWeight: 'bold' }}>Fecha Desde:</label>
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => {
                                setFechaInicioInvalida(e.target.validity.badInput);
                                setFechaInicio(e.target.value);
                                setErrorFechaInicio('');
                            }}
                            onBlur={(e) => setFechaInicioInvalida(e.target.validity.badInput)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: errorFechaInicio ? '1px solid #ef4444' : '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-h)', outline: 'none' }}
                        />
                        {errorFechaInicio && <span className={styles.textDanger}>{errorFechaInicio}</span>}
                    </div>

                    <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label style={{ fontWeight: 'bold' }}>Fecha Hasta:</label>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(e) => {
                                setFechaFinInvalida(e.target.validity.badInput);
                                setFechaFin(e.target.value);
                                setErrorFechaFin('');
                            }}
                            onBlur={(e) => setFechaFinInvalida(e.target.validity.badInput)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: errorFechaFin ? '1px solid #ef4444' : '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-h)', outline: 'none' }}
                        />
                        {errorFechaFin && <span className={styles.textDanger}>{errorFechaFin}</span>}
                    </div>

                    <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label style={{ fontWeight: 'bold' }}>Filtrar por Sector:</label>
                        <select
                            value={sectorFiltro}
                            onChange={(e) => setSectorFiltro(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-h)' }}
                        >
                            <option value="todos">Todos los sectores</option>
                            {sectores.map(s => (
                                <option key={s.id} value={s.id.toString()}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                        <Boton type="submit" variant="buscar">
                            Filtrar
                        </Boton>
                    </div>
                </div>
            </form>

            {/* CARDS DE MÉTRICAS */}
            {historial && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', width: '100%', maxWidth: '1100px', marginBottom: '30px' }}>
                    <div className={styles.tarjetaEstatica} style={{ textAlign: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Porcentaje de Cumplimiento</span>
                        <h1 style={{ margin: '10px 0 0 0', color: colorPct, fontSize: '2.5rem', fontWeight: 'bold' }}>
                            {historial.porcentaje_cumplimiento}%
                        </h1>
                    </div>

                    <div className={styles.tarjetaEstatica} style={{ textAlign: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Tareas Programadas</span>
                        <h2 style={{ margin: '10px 0 0 0', fontSize: '2rem', color: 'var(--text-h)' }}>{historial.total_esperadas}</h2>
                    </div>

                    <div className={styles.tarjetaEstatica} style={{ textAlign: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 'bold', textTransform: 'uppercase' }}>Ejecutadas / Realizadas</span>
                        <h2 style={{ margin: '10px 0 0 0', fontSize: '2rem', color: '#16a34a' }}>{historial.total_realizadas}</h2>
                    </div>

                    <div className={styles.tarjetaEstatica} style={{ textAlign: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 'bold', textTransform: 'uppercase' }}>Incumplidas</span>
                        <h2 style={{ margin: '10px 0 0 0', fontSize: '2rem', color: '#dc2626' }}>{historial.total_incumplidas}</h2>
                    </div>
                </div>
            )}

            {/* SECCIÓN TAREAS SISTEMÁTICAMENTE INCUMPLIDAS */}
            {historial && historial.tareas_incumplidas_resumen.length > 0 && (
                <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '1100px', marginBottom: '30px', textAlign: 'left', boxShadow: 'var(--shadow)' }}>
                    <h3 style={{ marginTop: 0, color: 'var(--text-h)', fontSize: '1.2rem' }}>
                        Tareas Sistemáticamente Incumplidas ({historial.tareas_incumplidas_resumen.length})
                    </h3>
                    <p className={styles.textMuted} style={{ fontSize: '0.95rem', marginBottom: '15px' }}>
                        Identificación de tareas con mayor frecuencia de incumplimiento en el período consultado:
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                        {historial.tareas_incumplidas_resumen.map((t) => (
                            <div key={`${t.tarea_id}-${t.plan_titulo}`} style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-h)', fontSize: '1.05rem' }}>{t.titulo_tarea}</h4>
                                    <p style={{ margin: '2px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        <strong>Plan:</strong> {t.plan_titulo} | <strong>Sector:</strong> {t.sector_nombre}
                                    </p>
                                    <p style={{ margin: '2px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        <strong>Frecuencia:</strong> <span style={{ textTransform: 'capitalize' }}>{t.frecuencia}</span>
                                    </p>
                                </div>
                                <div style={{ marginTop: '10px', textAlign: 'right' }}>
                                    <span style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                        {t.veces_incumplida} {t.veces_incumplida === 1 ? 'incumplimiento' : 'incumplimientos'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TABLA DE AUDITORÍA Y EJECUCIONES HISTÓRICAS */}
            <div className={styles.contenedorTabla}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '1.2fr 2.5fr 2.5fr 1fr 1.2fr 1.8fr 1fr', textAlign: 'center' }}>
                    <div style={{ textAlign: 'left' }}>Fecha</div>
                    <div style={{ textAlign: 'left' }}>Tarea</div>
                    <div style={{ textAlign: 'left' }}>Ubicación</div>
                    <div>Frecuencia</div>
                    <div>Estado</div>
                    <div style={{ textAlign: 'left' }}>Ejecutado Por</div>
                    <div>Acción</div>
                </div>

                {cargando ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Cargando historial de checklists...
                    </div>
                ) : registrosActuales.length === 0 ? (
                    <div className={styles.emptyMensaje}>
                        No se encontraron registros de checklists para el rango de fechas seleccionado.
                    </div>
                ) : (
                    registrosActuales.map((reg, idx) => (
                        <div key={`${reg.tarea_id}-${reg.plan_id}-${reg.fecha_programada}-${idx}`} className={styles.filaItem} style={{ gridTemplateColumns: '1.2fr 2.5fr 2.5fr 1fr 1.2fr 1.8fr 1fr', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ fontWeight: '500', textAlign: 'left', fontSize: '0.95rem' }}>
                                {reg.fecha_programada.split('-').reverse().join('/')}
                            </div>

                            <div style={{ fontWeight: '600', textAlign: 'left', fontSize: '1rem', color: 'var(--text-h)' }}>
                                {reg.titulo_tarea}
                            </div>

                            <div style={{ fontSize: '0.85rem', textAlign: 'left', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                <strong>Plan:</strong> {reg.plan_titulo} <br/>
                                <strong>Sector:</strong> {reg.sector_nombre}
                            </div>

                            <div style={{ textTransform: 'capitalize', fontSize: '0.9rem' }}>
                                {reg.frecuencia}
                            </div>

                            <div>
                                <span style={{
                                    fontSize: '0.85rem', fontWeight: 'bold',
                                    color: reg.realizada ? '#166534' : '#991b1b'
                                }}>
                                    {reg.realizada ? 'REALIZADA' : 'INCUMPLIDA'}
                                </span>
                            </div>

                            <div style={{ textAlign: 'left', fontSize: '0.85rem', color: reg.nombre_empleado ? 'var(--text-h)' : 'var(--text-muted)' }}>
                                {reg.nombre_empleado || '-'}
                            </div>

                            <div>
                                {reg.realizada ? (
                                    <Boton variant="ver" onClick={() => abrirDetalleTarea(reg.tarea_id, reg.plan_id)}>
                                        Detalle
                                    </Boton>
                                ) : (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin ejec.</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* PAGINACIÓN */}
            {totalPaginas > 1 && (
                <div className={styles.filaBotones} style={{ alignItems: 'center', marginTop: '30px', justifyContent: 'center' }}>
                    <Boton
                        variant="volver"
                        onClick={() => setPaginaActual(p => p - 1)}
                        disabled={paginaActual === 1}
                    >
                        Anterior
                    </Boton>

                    <span style={{ color: 'var(--text-h)', fontWeight: 'bold', margin: '0 15px' }}>
                        Página {paginaActual} de {totalPaginas}
                    </span>

                    <Boton
                        variant="siguiente"
                        onClick={() => setPaginaActual(p => p + 1)}
                        disabled={paginaActual === totalPaginas}
                    >
                        Siguiente
                    </Boton>
                </div>
            )}

            {/* MODAL VER DETALLE DE TAREA REALIZADA (SOLO LECTURA) */}
            {modalDetalleAbierto && (
                <div className={styles.modalOverlay}>
                    <div style={{ backgroundColor: 'var(--bg)', width: '95%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '30px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', textAlign: 'left' }}>
                        <h2 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '15px', color: 'var(--text-h)' }}>
                            Auditoría de Tarea Realizada
                        </h2>

                        {cargandoDetalle ? (
                            <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Cargando auditoría de la tarea...</p>
                        ) : detalleTarea ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <h3 style={{ color: 'var(--text-h)', margin: '0 0 5px 0' }}>{detalleTarea.titulo_tarea}</h3>
                                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                                        <strong>Plan:</strong> {detalleTarea.plan_titulo} | <strong>Sector:</strong> {detalleTarea.sector_nombre}
                                    </p>
                                </div>

                                <div style={{ backgroundColor: 'var(--card-bg)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <p style={{ margin: '4px 0' }}><strong>Completada por:</strong> {detalleTarea.nombre_empleado || 'No registrado'}</p>
                                    <p style={{ margin: '4px 0' }}>
                                        <strong>Fecha y Hora:</strong> {detalleTarea.fecha_hora_completada
                                            ? new Date(detalleTarea.fecha_hora_completada).toLocaleString('es-AR')
                                            : detalleTarea.fecha_programada}
                                    </p>
                                    {detalleTarea.evidencia_url && (
                                        <div style={{ marginTop: '10px' }}>
                                            <p style={{ margin: '0 0 6px 0', fontWeight: 'bold' }}>Evidencia adjuntada:</p>
                                            {detalleTarea.evidencia_url.startsWith('data:image') ||
                                             detalleTarea.evidencia_url.startsWith('http') ||
                                             detalleTarea.evidencia_url.startsWith('blob:') ? (
                                                <div style={{ textAlign: 'center', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                    <img
                                                        src={detalleTarea.evidencia_url}
                                                        alt="Evidencia adjuntada"
                                                        style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '6px', objectFit: 'contain' }}
                                                    />
                                                </div>
                                            ) : (
                                                <code>{detalleTarea.evidencia_url}</code>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {detalleTarea.observaciones && (
                                    <div>
                                        <strong>Observaciones registradas:</strong>
                                        <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '5px', fontStyle: 'italic', color: '#1f2937' }}>
                                            "{detalleTarea.observaciones}"
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h4 style={{ margin: '15px 0 10px 0', color: 'var(--text-h)' }}>Consumo Real de Insumos:</h4>
                                    {detalleTarea.consumos_reales && detalleTarea.consumos_reales.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {detalleTarea.consumos_reales.map(c => {
                                                const prod = productosList.find((p: any) => p.id === c.producto_limpieza_id);
                                                const unidad = prod?.unidad_medida?.nombre || '';
                                                return (
                                                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                                                        <span style={{ fontWeight: '500', color: '#166534' }}>{c.nombre_producto}</span>
                                                        <span style={{ fontWeight: 'bold', color: '#15803d' }}>{c.cantidad} {unidad ? unidad : 'unidades'}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No se registraron consumos para esta ejecución.</p>
                                    )}
                                </div>

                                <div className={styles.filaBotones} style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
                                    <Boton variant="volver" onClick={() => setModalDetalleAbierto(false)}>Cerrar</Boton>
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-danger)' }}>No se encontraron detalles para esta tarea.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
