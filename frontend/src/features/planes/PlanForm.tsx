import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { PlanLimpiezaPayload } from '../../types/planes';
import type { Sector } from '../../types/sectores';
import type { Equipo } from '../../types/equipos';
import type { Tarea } from '../../types/tareas';
import { getPlanById, savePlan } from '../../services/planesServices';
import { getSectores } from '../../services/sectoresServices';
import { getEquipos } from '../../services/equiposServices';
import { getTareas } from '../../services/tareasServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

interface FormValues {
    titulo: string;
    fecha_inicio: string;
    fecha_fin: string;
    sector_id: number | '';
    equipos_ids: string[];
    tareas_ids: string[];
}

export default function PlanForm() {
    const [sectores, setSectores] = useState<Sector[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    
    const [modalEquipos, setModalEquipos] = useState(false);
    const [modalTareas, setModalTareas] = useState(false);

    const [inicioInvalida, setInicioInvalida] = useState(false);
    const [finInvalida, setFinInvalida] = useState(false);

    const navigate = useNavigate();
    const { id } = useParams();
    const editando = Boolean(id);

    // Calculamos "hoy" con la hora local para el calendario
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hoyLocal = `${year}-${month}-${day}`;

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            titulo: '',
            fecha_inicio: hoyLocal,
            fecha_fin: '',
            sector_id: '',
            equipos_ids: [],
            tareas_ids: []
        }
    });

    const equiposSeleccionados = watch('equipos_ids') || [];
    const tareasSeleccionadas = watch('tareas_ids') || [];

    const removerEquipo = (idEquipo: string) => {
        setValue('equipos_ids', equiposSeleccionados.filter(val => val !== idEquipo), { shouldValidate: true });
    };

    const removerTarea = (idTarea: string) => {
        setValue('tareas_ids', tareasSeleccionadas.filter(val => val !== idTarea), { shouldValidate: true });
    };

    useEffect(() => {
        const cargarTodo = async () => {
            setCargando(true);
            try {
                const [sectoresData, equiposData, tareasData] = await Promise.all([
                    getSectores(),
                    getEquipos(),
                    getTareas()
                ]);
                setSectores(sectoresData);
                setEquipos(equiposData.filter(e => e.estado !== 'danado'));
                setTareas(tareasData);

                if (editando && id) {
                    const data = await getPlanById(id);
                    reset({
                        titulo: data.titulo,
                        fecha_inicio: data.fecha_inicio,
                        fecha_fin: data.fecha_fin || '',
                        sector_id: data.sector_id,
                        equipos_ids: data.equipos.map(e => e.id.toString()),
                        tareas_ids: data.tareas.map(t => t.id.toString())
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

        const payload: PlanLimpiezaPayload = {
            titulo: data.titulo,
            fecha_inicio: data.fecha_inicio,
            fecha_fin: data.fecha_fin ? data.fecha_fin : null,
            sector_id: Number(data.sector_id),
            equipos_ids: data.equipos_ids.map(Number),
            tareas_ids: data.tareas_ids.map(Number)
        };

        try {
            const exito = await savePlan(payload, id);
            if (exito) navigate('/planes');
            else setErrorMsg('Error al guardar el plan. Revisa que el nombre no esté duplicado.');
        } catch (error) {
            console.error('Error:', error);
            setErrorMsg('Error de conexión con el servidor.');
        }
    };

    if (cargando) {
        return (
            <div className={styles.contenedorPrincipal}>
                <h2>{editando ? 'Editar Plan de Limpieza' : 'Configurar Nuevo Plan'}</h2>
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Cargando información...
                </div>
            </div>
        );
    }

    const dateInputStyle = {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '6px',
        backgroundColor: '#ffffff',
        color: '#374151',
        fontSize: '1rem',
        fontFamily: 'inherit',
        boxSizing: 'border-box' as const,
        cursor: 'pointer'
    };

    const fechaAmigable = hoyLocal.split('-').reverse().join('/');

    const fechaInicioReg = register('fecha_inicio', {
        validate: (value) => {
            if (inicioInvalida) return "La fecha ingresada no existe en el calendario.";
            if (!value) return "La fecha de inicio es obligatoria";
            if (value < hoyLocal) return `La fecha debe ser igual o posterior a ${fechaAmigable}`;
            return true;
        }
    });

    const fechaFinReg = register('fecha_fin', {
        validate: (value, formValues) => {
            if (finInvalida) return "La fecha ingresada no existe en el calendario.";
            if (!value) return true;
            if (value < hoyLocal) return `La fecha no puede ser anterior a ${fechaAmigable}`;
            if (value < formValues.fecha_inicio) return "La fecha de fin no puede ser anterior a la de inicio";
            return true;
        }
    });

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{editando ? 'Editar Plan de Limpieza' : 'Configurar Nuevo Plan'}</h2>
            {errorMsg && <div style={{ color: '#ef4444', marginBottom: '15px', fontWeight: 'bold' }}>{errorMsg}</div>}
            
            {/* El noValidate apaga los carteles nativos del navegador */}
            <form onSubmit={handleSubmit(onSubmit)} className={styles.formularioTarjeta} noValidate>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '10px' }}>
                    <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label>Título del Plan:</label>
                        <input 
                            type="text" 
                            {...register('titulo', { required: "El título es obligatorio" })} 
                            style={{ border: errors.titulo ? '1px solid #ef4444' : '1px solid var(--border)', outline: 'none' }}
                        />
                        {errors.titulo && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.titulo.message}</span>}
                    </div>

                    <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label>Sector Asignado:</label>
                        <select 
                            {...register('sector_id', { required: "Debe seleccionar un sector" })}
                            style={{ border: errors.sector_id ? '1px solid #ef4444' : '1px solid var(--border)', outline: 'none' }}
                        >
                            <option value="">-- Seleccionar --</option>
                            {sectores.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                        {errors.sector_id && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.sector_id.message}</span>}
                    </div>

                    <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label>Fecha de Inicio:</label>
                        <input 
                            type="date" 
                            min={hoyLocal} 
                            {...fechaInicioReg}
                            onChange={(e) => {
                                setInicioInvalida(e.target.validity.badInput);
                                fechaInicioReg.onChange(e);
                            }}
                            onBlur={(e) => {
                                setInicioInvalida(e.target.validity.badInput);
                                fechaInicioReg.onBlur(e);
                            }}
                            style={{ ...dateInputStyle, border: errors.fecha_inicio ? '1px solid #ef4444' : '1px solid var(--border)', outline: 'none' }}
                        />
                        {errors.fecha_inicio && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.fecha_inicio.message}</span>}
                    </div>

                    <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label>Fecha de Fin (Opcional):</label>
                        <input 
                            type="date" 
                            min={hoyLocal} 
                            {...fechaFinReg}
                            onChange={(e) => {
                                setFinInvalida(e.target.validity.badInput);
                                fechaFinReg.onChange(e);
                            }}
                            onBlur={(e) => {
                                setFinInvalida(e.target.validity.badInput);
                                fechaFinReg.onBlur(e);
                            }}
                            style={{ ...dateInputStyle, border: errors.fecha_fin ? '1px solid #ef4444' : '1px solid var(--border)', outline: 'none' }}
                        />
                        {errors.fecha_fin && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.fecha_fin.message}</span>}
                    </div>
                </div>

                <hr style={{ margin: '40px 0', borderColor: 'var(--border)' }} />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                    
                    {/* Selector de Equipos */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <label style={{ fontWeight: 'bold', margin: 0 }}>Equipos Asociados:</label>
                            <button 
                                type="button" 
                                onClick={() => setModalEquipos(true)}
                                style={{ background: 'none', border: 'none', color: '#16a34a', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                + Seleccionar
                            </button>
                        </div>
                        
                        <div style={{ 
                            minHeight: '60px', 
                            padding: '10px', 
                            border: errors.equipos_ids ? '1px solid #ef4444' : '1px dashed #ccc', 
                            borderRadius: '8px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                            backgroundColor: 'var(--card-bg)'
                        }}>
                            {equiposSeleccionados.length === 0 && <span style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 'auto' }}>Ningún equipo seleccionado</span>}
                            
                            {equiposSeleccionados.map(idString => {
                                const eq = equipos.find(e => e.id.toString() === idString);
                                if (!eq) return null;
                                return (
                                    <div key={eq.id} style={{ display: 'flex', alignItems: 'center', background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>
                                        {eq.nombre}
                                        <button type="button" onClick={() => removerEquipo(idString)} style={{ background: 'none', border: 'none', color: '#166534', marginLeft: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', padding: 0 }}>&times;</button>
                                    </div>
                                );
                            })}
                        </div>
                        {errors.equipos_ids && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px', display: 'block' }}>{errors.equipos_ids.message}</span>}
                        <input type="hidden" {...register('equipos_ids', { required: "Debes seleccionar al menos un equipo" })} />
                    </div>

                    {/* Selector de Tareas */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <label style={{ fontWeight: 'bold', margin: 0 }}>Tareas a Ejecutar:</label>
                            <button 
                                type="button" 
                                onClick={() => setModalTareas(true)}
                                style={{ background: 'none', border: 'none', color: '#16a34a', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                + Seleccionar
                            </button>
                        </div>
                        
                        <div style={{ 
                            minHeight: '60px', 
                            padding: '10px', 
                            border: errors.tareas_ids ? '1px solid #ef4444' : '1px dashed #ccc', 
                            borderRadius: '8px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                            backgroundColor: 'var(--card-bg)'
                        }}>
                            {tareasSeleccionadas.length === 0 && <span style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 'auto' }}>Ninguna tarea seleccionada</span>}
                            
                            {tareasSeleccionadas.map(idString => {
                                const tarea = tareas.find(t => t.id.toString() === idString);
                                if (!tarea) return null;
                                return (
                                    <div key={tarea.id} style={{ display: 'flex', alignItems: 'center', background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>
                                        {tarea.titulo}
                                        <button type="button" onClick={() => removerTarea(idString)} style={{ background: 'none', border: 'none', color: '#0369a1', marginLeft: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', padding: 0 }}>&times;</button>
                                    </div>
                                );
                            })}
                        </div>
                        {errors.tareas_ids && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px', display: 'block' }}>{errors.tareas_ids.message}</span>}
                        <input type="hidden" {...register('tareas_ids', { required: "Debes seleccionar al menos una tarea" })} />
                    </div>
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '40px', justifyContent: 'center' }}>
                    <Boton type="submit" variant="guardar">
                        {editando ? 'Actualizar Plan' : 'Guardar Plan'}
                    </Boton>
                    <Link to="/planes">
                        <Boton variant="volver">Cancelar</Boton>
                    </Link>
                </div>
            </form>

            {/* ---MODALS--- */}
            
            {/* Modal de Equipos */}
            {modalEquipos && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ backgroundColor: 'var(--bg)', width: '90%', maxWidth: '500px', maxHeight: '80vh', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Seleccionar Equipos</h3>
                        
                        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {equipos.length === 0 ? <p>No hay equipos operativos disponibles.</p> : null}
                            {equipos.map(e => (
                                <label key={e.id} style={{ display: 'flex', alignItems: 'center', padding: '10px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}>
                                    <input type="checkbox" value={e.id} {...register('equipos_ids')} style={{ marginRight: '15px', width: '18px', height: '18px', accentColor: '#16a34a' }} />
                                    <span>{e.nombre}</span>
                                </label>
                            ))}
                        </div>
                        
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <Boton type="button" variant="guardar" onClick={() => setModalEquipos(false)}>Listo</Boton>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Tareas */}
            {modalTareas && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ backgroundColor: 'var(--bg)', width: '90%', maxWidth: '500px', maxHeight: '80vh', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Seleccionar Tareas</h3>
                        
                        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {tareas.length === 0 ? <p>No hay tareas configuradas.</p> : null}
                            {tareas.map(t => (
                                <label key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '10px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}>
                                    <input type="checkbox" value={t.id} {...register('tareas_ids')} style={{ marginRight: '15px', width: '18px', height: '18px', accentColor: '#0369a1' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: '500' }}>{t.titulo}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Frecuencia: {t.frecuencia}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                        
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <Boton type="button" style={{ backgroundColor: '#0369a1' }} variant="guardar" onClick={() => setModalTareas(false)}>Listo</Boton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}