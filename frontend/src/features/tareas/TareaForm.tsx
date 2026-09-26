import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import type { TareaPayload, FrecuenciaTarea } from '../../types/tareas';
import type { PlanLimpieza } from '../../types/planes';
import { getTareaById, saveTarea } from '../../services/tareasServices';
import { getPlanes } from '../../services/planesServices';
import { getProductos } from '../../services/productosLimpiezaServices'; 
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

interface FormValues {
    titulo: string;
    frecuencia: string;
    planes_ids: string[];
    consumos_estimados: {
        producto_limpieza_id: number | '';
        cantidad: number | '';
    }[];
}

export default function TareaForm() {
    const [planes, setPlanes] = useState<PlanLimpieza[]>([]);
    const [productos, setProductos] = useState<{id: number, nombre: string, stock: number}[]>([]); 
    
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    
    const [modalPlanes, setModalPlanes] = useState(false);

    const navigate = useNavigate();
    const { id } = useParams();
    const editando = Boolean(id);

    const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            titulo: '',
            frecuencia: 'diaria',
            planes_ids: [],
            consumos_estimados: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "consumos_estimados"
    });

    const planesSeleccionados = watch('planes_ids') || [];

    const removerPlan = (idPlan: string) => {
        setValue('planes_ids', planesSeleccionados.filter(val => val !== idPlan), { shouldValidate: true });
    };

    useEffect(() => {
        const cargarTodo = async () => {
            setCargando(true);
            try {
                const [planesData, productosData] = await Promise.all([
                    getPlanes(),
                    getProductos(true) 
                ]);
                setPlanes(planesData);
                setProductos(productosData);

                if (editando && id) {
                    const data = await getTareaById(id);
                    reset({
                        titulo: data.titulo,
                        frecuencia: data.frecuencia,
                        planes_ids: data.planes ? data.planes.map((p: any) => p.id.toString()) : [],
                        consumos_estimados: data.consumos_estimados ? data.consumos_estimados.map((c: any) => ({
                            producto_limpieza_id: c.producto_limpieza.id,
                            cantidad: c.cantidad
                        })) : []
                    });
                }
            } catch (err) {
                console.error("Error al cargar dependencias:", err);
            } finally {
                setCargando(false);
            }
        };
        cargarTodo();
    }, [id, editando, reset]);

    const onSubmit = async (data: FormValues) => {
        setErrorMsg('');

        // Validación para evitar duplicados en la lista de insumos
        const productIds = data.consumos_estimados.map(c => Number(c.producto_limpieza_id));
        if (new Set(productIds).size !== productIds.length) {
            setErrorMsg("No se puede cargar dos veces el mismo producto. Sumá las cantidades en un solo registro.");
            return;
        }

        const payload: TareaPayload = {
            titulo: data.titulo,
            frecuencia: data.frecuencia as FrecuenciaTarea,
            planes: data.planes_ids.map(Number),
            consumos_estimados: data.consumos_estimados.map(c => ({
                producto_limpieza_id: Number(c.producto_limpieza_id),
                cantidad: Number(c.cantidad)
            }))
        };

        try {
            const exito = await saveTarea(payload, id);
            if (exito) navigate('/tareas');
            else setErrorMsg('Error al guardar la tarea. Revisa los datos.');
        } catch (error) {
            console.error('Error:', error);
            setErrorMsg('Error de conexión con el servidor.');
        }
    };

    if (cargando) {
        return (
            <div className={styles.contenedorPrincipal}>
                <h2>{editando ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Cargando información...
                </div>
            </div>
        );
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{editando ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
            {errorMsg && <div style={{ color: '#ef4444', marginBottom: '15px', fontWeight: 'bold' }}>{errorMsg}</div>}
            
            <form onSubmit={handleSubmit(onSubmit)} className={styles.formularioTarjeta} noValidate>
                
                <div className={styles.formGroup}>
                    <label>Título de la Tarea:</label>
                    <input 
                        type="text" 
                        placeholder="Ej: Limpieza de pisos"
                        {...register('titulo', { required: "El título de la tarea es obligatorio" })} 
                        style={{ border: errors.titulo ? '1px solid #ef4444' : '1px solid var(--border)', outline: 'none' }}
                    />
                    {errors.titulo && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px', display: 'block' }}>{errors.titulo.message}</span>}
                </div>

                <div className={styles.formGroup}>
                    <label>Frecuencia:</label>
                    <select 
                        {...register('frecuencia', { required: "Debe seleccionar una frecuencia" })}
                        style={{ border: errors.frecuencia ? '1px solid #ef4444' : '1px solid var(--border)', outline: 'none' }}
                    >
                        <option value="diaria">Diaria</option>
                        <option value="semanal">Semanal</option>
                        <option value="mensual">Mensual</option>
                        <option value="eventual">Eventual</option>
                    </select>
                    {errors.frecuencia && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px', display: 'block' }}>{errors.frecuencia.message}</span>}
                </div>

                <div className={styles.formGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <label style={{ fontWeight: 'bold', margin: 0 }}>Asignar a Planes (Opcional):</label>
                        <button 
                            type="button" 
                            onClick={() => setModalPlanes(true)}
                            style={{ background: 'none', border: 'none', color: '#16a34a', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            + Seleccionar Planes
                        </button>
                    </div>
                    
                    <div style={{ 
                        minHeight: '60px', 
                        padding: '10px', 
                        border: '1px dashed #ccc', 
                        borderRadius: '8px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        backgroundColor: 'var(--card-bg)'
                    }}>
                        {planesSeleccionados.length === 0 && <span style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 'auto' }}>Ningún plan seleccionado</span>}
                        
                        {planesSeleccionados.map(idString => {
                            const planObj = planes.find(p => p.id.toString() === idString);
                            if (!planObj) return null;
                            return (
                                <div key={planObj.id} style={{ display: 'flex', alignItems: 'center', background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>
                                    {planObj.titulo}
                                    <button type="button" onClick={() => removerPlan(idString)} style={{ background: 'none', border: 'none', color: '#0369a1', marginLeft: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', padding: 0 }}>&times;</button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <hr style={{ margin: '30px 0', borderColor: 'var(--border)' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Consumos Estimados (Insumos)</h3>
                    <Boton type="button" variant="crear" onClick={() => append({ producto_limpieza_id: '', cantidad: '' })}>
                         Agregar Producto
                    </Boton>
                </div>
                
                {fields.length === 0 ? (
                    <div style={{ padding: '20px', border: '1px dashed var(--border)', borderRadius: '8px', backgroundColor: 'var(--card-bg)', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay consumos estimados configurados para esta tarea.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {fields.map((item, index) => {
                            const errorProd = errors.consumos_estimados?.[index]?.producto_limpieza_id;
                            const errorCant = errors.consumos_estimados?.[index]?.cantidad;

                            return (
                                <div key={item.id} style={{ 
                                    display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '20px', alignItems: 'center',
                                    padding: '20px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: '#fff'
                                }}>
                                    
                                    <div style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Producto:</label>
                                        <select 
                                            {...register(`consumos_estimados.${index}.producto_limpieza_id`, { required: "Seleccioná un producto" })}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: errorProd ? '1px solid #ef4444' : '1px solid var(--border)', outline: 'none' }}
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {productos.map(p => (
                                                <option key={p.id} value={p.id}>{p.nombre} (Stock actual: {p.stock})</option>
                                            ))}
                                        </select>
                                        {errorProd && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errorProd.message}</span>}
                                    </div>
                                    
                                    <div style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Cantidad estimada:</label>
                                        <input 
                                            type="number" 
                                            step="any"
                                            min="0.01"
                                            {...register(`consumos_estimados.${index}.cantidad`, { required: "Ingresá una cantidad", min: { value: 0.01, message: "Debe ser mayor a 0" } })} 
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: errorCant ? '1px solid #ef4444' : '1px solid var(--border)', outline: 'none' }}
                                        />
                                        {errorCant && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errorCant.message}</span>}
                                    </div>

                                    <button 
                                        type="button" 
                                        onClick={() => remove(index)} 
                                        title="Quitar producto"
                                        style={{ 
                                            marginTop: '25px', background: 'none', border: 'none', 
                                            color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className={styles.filaBotones} style={{ marginTop: '40px', justifyContent: 'center' }}>
                    <Boton type="submit" variant="guardar">
                        {editando ? 'Actualizar Tarea' : 'Guardar Tarea'}
                    </Boton>
                    <Link to="/tareas">
                        <Boton variant="volver">Cancelar</Boton>
                    </Link>
                </div>
            </form>

            {modalPlanes && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ backgroundColor: 'var(--bg)', width: '90%', maxWidth: '500px', maxHeight: '80vh', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Seleccionar Planes</h3>
                        
                        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {planes.length === 0 ? <p>No hay planes creados en el sistema.</p> : null}
                            {planes.map(p => {
                                const isSelected = planesSeleccionados.includes(p.id.toString());
                                return (
                                    <label key={p.id} style={{ 
                                        display: 'flex', alignItems: 'center', padding: '12px 16px', 
                                        backgroundColor: isSelected ? '#f0fdf4' : 'var(--card-bg)', 
                                        border: isSelected ? '2px solid #16a34a' : '1px solid var(--border)', 
                                        borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease'
                                    }}>
                                        <input 
                                            type="checkbox" 
                                            value={p.id} 
                                            {...register('planes_ids')} 
                                            style={{ marginRight: '15px', width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }} 
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: isSelected ? '600' : '500', color: isSelected ? '#166534' : 'inherit' }}>
                                                {p.titulo}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: isSelected ? '#16a34a' : 'var(--text-muted)' }}>
                                                Sector: {p.sector?.nombre || 'Sin asignar'}
                                            </span>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                        
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <Boton type="button" variant="guardar" onClick={() => setModalPlanes(false)}>Listo</Boton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}