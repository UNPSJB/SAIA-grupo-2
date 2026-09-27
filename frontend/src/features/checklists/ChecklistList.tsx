import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { ChecklistItem, ChecklistMarcarPayload, RegistroChecklistDetalle } from '../../types/checklists';
import { getChecklistHoy, marcarTareaCompletada, getDetalleTareaRealizada } from '../../services/checklistsServices';
import { getEmpleados } from '../../services/empleadosServices';
import { getTareaById } from '../../services/tareasServices';
import Boton from '../../components/Boton';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/shared.module.css';

interface FormValues {
    empleado_id: string;
    observaciones: string;
    evidencia: FileList; 
    consumos: {
        producto_limpieza_id: string;
        nombre_producto: string;
        cantidad_estimada: number;
        cantidad: string; 
    }[];
}

export default function ChecklistList() {
    const { usuario } = useAuth();
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [empleados, setEmpleados] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [sectorFiltro, setSectorFiltro] = useState<string>('todos');

    const [modalAbierto, setModalAbierto] = useState(false);
    const [tareaActiva, setTareaActiva] = useState<number | null>(null);
    const [planActivo, setPlanActivo] = useState<number | null>(null);
    const [cargandoModal, setCargandoModal] = useState(false);

    const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
    const [detalleTarea, setDetalleTarea] = useState<RegistroChecklistDetalle | null>(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    const { register, control, handleSubmit, reset } = useForm<FormValues>({
        defaultValues: { empleado_id: '', observaciones: '', consumos: [] }
    });

    const { fields } = useFieldArray({ control, name: 'consumos' });

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const [checklistData, empleadosData] = await Promise.all([
                getChecklistHoy(usuario?.id),
                getEmpleados()
            ]);
            setChecklist(checklistData);
            setEmpleados(empleadosData);
        } catch (error) {
            console.error("Error cargando checklist:", error);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [usuario?.id]);

    const abrirModal = async (tarea_id: number, plan_id: number) => {
        setTareaActiva(tarea_id);
        setPlanActivo(plan_id);
        setModalAbierto(true);
        setCargandoModal(true);
        
        try {
            const tareaOriginal = await getTareaById(tarea_id.toString());
            const consumosPredefinidos = tareaOriginal.consumos_estimados?.map((c: any) => ({
                producto_limpieza_id: c.producto_limpieza.id.toString(),
                nombre_producto: c.producto_limpieza.nombre,
                cantidad_estimada: c.cantidad,
                cantidad: c.cantidad.toString() 
            })) || [];

            reset({ empleado_id: usuario?.id ? usuario.id.toString() : '', observaciones: '', consumos: consumosPredefinidos });
        } catch (error) {
            console.error("Error al cargar detalles de la tarea", error);
            reset({ empleado_id: usuario?.id ? usuario.id.toString() : '', observaciones: '', consumos: [] });
        } finally {
            setCargandoModal(false);
        }
    };

    const abrirDetalleTarea = async (tarea_id: number, plan_id: number) => {
        setModalDetalleAbierto(true);
        setCargandoDetalle(true);
        try {
            const data = await getDetalleTareaRealizada(tarea_id, plan_id);
            setDetalleTarea(data);
        } catch (error) {
            console.error("Error al obtener detalle de la tarea:", error);
        } finally {
            setCargandoDetalle(false);
        }
    };

    const onSubmit = async (data: FormValues) => {
        if (!tareaActiva) return;

        const nombreArchivo = data.evidencia && data.evidencia.length > 0 ? data.evidencia[0].name : '';
        const payload: ChecklistMarcarPayload = {
            plan_id: planActivo || undefined,
            empleado_id: Number(data.empleado_id),
            observaciones: data.observaciones,
            evidencia_url: nombreArchivo, 
            consumos: data.consumos.map(c => ({
                producto_limpieza_id: Number(c.producto_limpieza_id),
                cantidad: Number(c.cantidad)
            }))
        };

        const exito = await marcarTareaCompletada(tareaActiva, payload);
        if (exito) {
            setModalAbierto(false);
            cargarDatos();
        } else {
            alert("Error al guardar el registro.");
        }
    };

    const sectoresUnicos = Array.from(new Set(checklist.map(item => item.sector_nombre).filter(Boolean)));

    const checklistFiltrado = checklist.filter(t => sectorFiltro === 'todos' || t.sector_nombre === sectorFiltro);

    if (cargando) return <div className={styles.contenedorPrincipal}>Cargando tareas del día...</div>;

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Checklist del Día</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '15px', fontSize: '1.1rem' }}>
                {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            {sectoresUnicos.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '1100px', marginBottom: '15px', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontWeight: '500', color: 'var(--text-h)' }}>Filtrar por Sector:</label>
                    <select
                        value={sectorFiltro}
                        onChange={(e) => setSectorFiltro(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', maxWidth: '250px' }}
                    >
                        <option value="todos">Todos los sectores</option>
                        {sectoresUnicos.map(sec => (
                            <option key={sec} value={sec}>{sec}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className={styles.contenedorTabla}>
                <div className={styles.filaHeader} style={{ gridTemplateColumns: '2.5fr 2.5fr 1fr 1fr 1.2fr', textAlign: 'center' }}>
                    <div style={{ textAlign: 'left' }}>Tarea</div>
                    <div style={{ textAlign: 'left' }}>Ubicación</div>
                    <div>Frecuencia</div>
                    <div>Estado</div>
                    <div>Acción</div>
                </div>

                {checklistFiltrado.length === 0 ? (
                    <div className={styles.emptyMensaje}>No hay tareas programadas para hoy en el sector seleccionado.</div>
                ) : (
                    checklistFiltrado.map(tarea => (
                        <div key={`${tarea.tarea_id}-${tarea.plan_id}`} className={styles.filaItem} style={{ gridTemplateColumns: '2.5fr 2.5fr 1fr 1fr 1.2fr', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ fontWeight: '600', textAlign: 'left', fontSize: '1.05rem' }}>
                                {tarea.titulo_tarea}
                            </div>
                            
                            <div style={{ fontSize: '0.85rem', textAlign: 'left', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                <strong>Planes:</strong> {tarea.plan_titulo} <br/>
                                <strong>Sectores:</strong> {tarea.sector_nombre}
                            </div>
                            
                            <div style={{ textTransform: 'capitalize' }}>
                                {tarea.frecuencia}
                            </div>
                            
                            <div>
                                <span style={{ 
                                    padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold',
                                    backgroundColor: tarea.estado === 'realizada' ? '#dcfce7' : '#fee2e2',
                                    color: tarea.estado === 'realizada' ? '#166534' : '#991b1b'
                                }}>
                                    {tarea.estado.toUpperCase()}
                                </span>
                            </div>
                            
                            <div>
                                {tarea.estado === 'pendiente' ? (
                                    <Boton variant="guardar" onClick={() => abrirModal(tarea.tarea_id, tarea.plan_id)}>
                                        Completar
                                    </Boton>
                                ) : (
                                    <Boton variant="ver" onClick={() => abrirDetalleTarea(tarea.tarea_id, tarea.plan_id)}>
                                        Ver Detalle
                                    </Boton>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODAL COMPLETAR TAREA */}
            {modalAbierto && (
                <div className={styles.modalOverlay}>
                    <div style={{ backgroundColor: 'var(--bg)', width: '95%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '30px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <h2 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>Registrar Tarea</h2>
                        
                        {cargandoModal ? (
                            <p style={{ textAlign: 'center', padding: '40px 0', fontSize: '1.2rem', color: 'var(--text-muted)' }}>Cargando detalles de la tarea...</p>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)} className={styles.formularioTarjeta} style={{ boxShadow: 'none', padding: 0, border: 'none' }}>
                                
                                <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
                                    <label style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Empleado a cargo:</label>
                                    <select {...register('empleado_id', { required: true })} style={{ width: '100%', padding: '12px', fontSize: '1rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#fff', color: '#1f2937' }}>
                                        <option value="">-- Seleccionar empleado --</option>
                                        {empleados.map(e => (
                                            <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
                                    <label style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Evidencia Fotográfica (Opcional):</label>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment" 
                                        {...register('evidencia')} 
                                        style={{ width: '100%', padding: '10px', fontSize: '1rem', borderRadius: '8px', border: '1px dashed var(--border)', backgroundColor: '#f9fafb', color: '#1f2937' }} 
                                    />
                                    <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '5px' }}>Desde el celular, esto abrirá la cámara directamente.</small>
                                </div>

                                <div className={styles.formGroup} style={{ marginBottom: '25px' }}>
                                    <label style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Observaciones (Opcional):</label>
                                    <textarea 
                                        {...register('observaciones')} 
                                        rows={3} 
                                        placeholder="Ej: Quedó una mancha que no salió, se rompió un trapo, etc."
                                        style={{ 
                                            width: '100%', 
                                            padding: '14px', 
                                            fontSize: '1rem', 
                                            borderRadius: '8px', 
                                            border: '1px solid var(--border)', 
                                            backgroundColor: '#ffffff',
                                            color: '#1f2937',
                                            fontFamily: 'inherit',
                                            resize: 'vertical',
                                            boxSizing: 'border-box',
                                            outline: 'none'
                                        }}
                                    ></textarea>
                                </div>

                                <hr style={{ margin: '30px 0', borderColor: 'var(--border)' }} />

                                <div style={{ marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>Consumo de Insumos</h3>
                                    
                                    {fields.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Esta tarea no requiere insumos.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            {fields.map((item, index) => (
                                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#166534' }}>{item.nombre_producto}</span>
                                                        <span style={{ fontSize: '0.9rem', color: '#15803d' }}>Estimado: {item.cantidad_estimada}</span>
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#166534' }}>Usado:</label>
                                                        <input 
                                                            type="number" 
                                                            step="any"
                                                            {...register(`consumos.${index}.cantidad`, { required: true, min: 0 })} 
                                                            style={{ width: '100px', padding: '10px', fontSize: '1.1rem', borderRadius: '6px', border: '1px solid #16a34a', textAlign: 'center', backgroundColor: '#fff', color: '#1f2937' }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className={styles.filaBotones} style={{ marginTop: '30px', justifyContent: 'flex-end', gap: '15px' }}>
                                    <Boton type="button" variant="volver" onClick={() => setModalAbierto(false)}>Cancelar</Boton>
                                    <Boton type="submit" variant="guardar">Completar Tarea</Boton>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL VER DETALLE DE TAREA REALIZADA */}
            {modalDetalleAbierto && (
                <div className={styles.modalOverlay}>
                    <div style={{ backgroundColor: 'var(--bg)', width: '95%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '30px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', textAlign: 'left' }}>
                        <h2 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '15px', color: 'var(--text-h)' }}>
                            Detalle de Tarea Realizada
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
                                        <p style={{ margin: '4px 0' }}><strong>Evidencia adjuntada:</strong> <code>{detalleTarea.evidencia_url}</code></p>
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
                                            {detalleTarea.consumos_reales.map(c => (
                                                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                                                    <span style={{ fontWeight: '500', color: '#166534' }}>{c.nombre_producto}</span>
                                                    <span style={{ fontWeight: 'bold', color: '#15803d' }}>{c.cantidad} unidades</span>
                                                </div>
                                            ))}
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