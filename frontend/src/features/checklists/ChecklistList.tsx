import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { ChecklistItem, ChecklistMarcarPayload, RegistroChecklistDetalle } from '../../types/checklists';
import { getChecklistHoy, marcarTareaCompletada, getDetalleTareaRealizada } from '../../services/checklistsServices';
import { getEmpleados } from '../../services/empleadosServices';
import { getTareaById } from '../../services/tareasServices';
import { getProductos } from '../../services/productosLimpiezaServices';
import ModalAlerta from '../../components/alerta';
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
        stock_disponible: number;
        unidad_medida: string;
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

    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });
    const [vistaPreviaEvidencia, setVistaPreviaEvidencia] = useState<string | null>(null);

    const { register, control, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
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
        setVistaPreviaEvidencia(null);
        setModalAbierto(true);
        setCargandoModal(true);
        
        try {
            const [tareaOriginal, productosData] = await Promise.all([
                getTareaById(tarea_id.toString()),
                getProductos()
            ]);

            const consumosPredefinidos = tareaOriginal.consumos_estimados?.map((c: any) => {
                const prod = productosData.find((p: any) => p.id === c.producto_limpieza.id);
                const stockActual = prod ? prod.stock : (c.producto_limpieza.stock ?? 0);
                const unidad = c.producto_limpieza?.unidad_medida?.nombre || '';
                return {
                    producto_limpieza_id: c.producto_limpieza.id.toString(),
                    nombre_producto: c.producto_limpieza.nombre,
                    cantidad_estimada: c.cantidad,
                    cantidad: c.cantidad.toString(),
                    stock_disponible: stockActual,
                    unidad_medida: unidad
                };
            }) || [];

            reset({ empleado_id: usuario?.id ? usuario.id.toString() : '', observaciones: '', consumos: consumosPredefinidos });
        } catch (error) {
            console.error("Error al cargar detalles de la tarea", error);
            reset({ empleado_id: usuario?.id ? usuario.id.toString() : '', observaciones: '', consumos: [] });
        } finally {
            setCargandoModal(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setVistaPreviaEvidencia(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setVistaPreviaEvidencia(null);
        }
    };

    const quitarEvidencia = () => {
        setVistaPreviaEvidencia(null);
        try {
            setValue('evidencia', new DataTransfer().files);
        } catch {
            // fallback for environments without DataTransfer constructor
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

        let evidenciaUrl = '';
        if (data.evidencia && data.evidencia.length > 0) {
            evidenciaUrl = vistaPreviaEvidencia || data.evidencia[0].name;
        }

        const payload: ChecklistMarcarPayload = {
            plan_id: planActivo || undefined,
            empleado_id: Number(data.empleado_id),
            observaciones: data.observaciones,
            evidencia_url: evidenciaUrl,
            consumos: data.consumos.map(c => ({
                producto_limpieza_id: Number(c.producto_limpieza_id),
                cantidad: Number(c.cantidad)
            }))
        };

        const res = await marcarTareaCompletada(tareaActiva, payload);
        if (res.ok) {
            setModalAbierto(false);
            setVistaPreviaEvidencia(null);
            cargarDatos();
        } else {
            setModalAlerta({
                isOpen: true,
                titulo: "Error al Guardar",
                mensaje: res.mensaje || "Error al guardar el registro."
            });
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
                                    fontSize: '0.85rem', fontWeight: 'bold',
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
                                        {...register('evidencia', {
                                            onChange: handleFileChange
                                        })}
                                        style={{ width: '100%', padding: '10px', fontSize: '1rem', borderRadius: '8px', border: '1px dashed var(--border)', backgroundColor: '#f9fafb', color: '#1f2937' }} 
                                    />
                                    <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '5px' }}>Desde el celular, esto abrirá la cámara directamente.</small>

                                    {vistaPreviaEvidencia && (
                                        <div style={{ position: 'relative', marginTop: '12px', textAlign: 'center', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-h)' }}>Vista previa de la evidencia:</p>
                                                <button
                                                    type="button"
                                                    onClick={quitarEvidencia}
                                                    title="Quitar foto"
                                                    style={{
                                                        background: '#fee2e2',
                                                        color: '#dc2626',
                                                        border: '1px solid #fca5a5',
                                                        borderRadius: '50%',
                                                        width: '26px',
                                                        height: '26px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        fontSize: '1rem',
                                                        lineHeight: 1,
                                                        padding: 0
                                                    }}
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                            <img
                                                src={vistaPreviaEvidencia}
                                                alt="Vista previa evidencia"
                                                style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '6px', objectFit: 'contain' }}
                                            />
                                        </div>
                                    )}
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
                                            {fields.map((item, index) => {
                                                const errCant = errors.consumos?.[index]?.cantidad;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            padding: '15px',
                                                            backgroundColor: errCant ? '#fef2f2' : '#f0fdf4',
                                                            border: errCant ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                                                            borderRadius: '8px',
                                                            gap: '8px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: errCant ? '#991b1b' : '#166534' }}>
                                                                    {item.nombre_producto}
                                                                </span>
                                                                <span style={{ fontSize: '0.85rem', color: errCant ? '#b91c1c' : '#15803d' }}>
                                                                    Estimado: {item.cantidad_estimada} | Stock disponible: {item.stock_disponible}
                                                                </span>
                                                            </div>

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: errCant ? '#991b1b' : '#166534' }}>
                                                                    Usado:
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    step="any"
                                                                    {...register(`consumos.${index}.cantidad`, {
                                                                        required: "Debe ingresar una cantidad",
                                                                        min: { value: 0, message: "No puede ser menor a 0" },
                                                                        validate: (val) => {
                                                                            const num = Number(val);
                                                                            if (isNaN(num)) return "Ingresa un número válido";
                                                                            if (num > item.stock_disponible) {
                                                                                return `Stock insuficiente para registrar el consumo`;
                                                                            }
                                                                            return true;
                                                                        }
                                                                    })}
                                                                    style={{
                                                                        width: '110px',
                                                                        padding: '10px',
                                                                        fontSize: '1.1rem',
                                                                        borderRadius: '6px',
                                                                        border: errCant ? '2px solid #ef4444' : '1px solid #16a34a',
                                                                        textAlign: 'center',
                                                                        backgroundColor: '#fff',
                                                                        color: '#1f2937',
                                                                        outline: 'none'
                                                                    }}
                                                                />
                                                                <span style={{color:'var(--text-muted', fontWeight: '500', fontSize:'0.9rem'}}>
                                                                    {item.unidad_medida || 'sdsd'}
                                                                    {/* {productos.find(p=> p.id.toString()=== consumosActuales[index]?.producto_limpieza_id?.toString())?.unidad_medida?.nombre ||''} */}
                                                                </span>
                                                                
                                                            </div>
                                                        </div>

                                                        {errCant && (
                                                            <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: '600', marginTop: '2px', textAlign: 'right' }}>
                                                                {errCant.message}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
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

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={() => setModalAlerta({ ...modalAlerta, isOpen: false })}
            />
        </div>
    );
}