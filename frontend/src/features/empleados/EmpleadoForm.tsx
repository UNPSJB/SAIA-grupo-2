import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { Capacidad } from '../../types/capacidades';
import type { Sector } from '../../types/sectores';
import type { EmpleadoPayload } from '../../types/empleados';
import { getCapacidades } from '../../services/capacidadesServices';
import { getSectores } from '../../services/sectoresServices';
import { getEmpleadoById, saveEmpleado } from '../../services/empleadosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

interface FormValues {
    dni: string;
    nombre: string;
    apellido: string;
    activo: boolean;
    listaCapacidades: number[];
    listaSectores: number[];
}

export default function EmpleadoForm() {
    const [capacidadesDisponibles, setCapacidadesDisponibles] = useState<Capacidad[]>([]);
    const [sectoresDisponibles, setSectoresDisponibles] = useState<Sector[]>([]);
    
    const navigate = useNavigate();
    const { id } = useParams();
    const editando = Boolean(id);
    const idNum = id ? Number(id) : null;

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            dni: '',
            nombre: '',
            apellido: '',
            activo: true,
            listaCapacidades: [],
            listaSectores: []
        }
    });

    const capacidadesActuales = watch('listaCapacidades');
    const sectoresActuales = watch('listaSectores');

    useEffect(() => {
        const cargarDatos = async () => {
            const [capsData, sectsData] = await Promise.all([
                getCapacidades(),
                getSectores()
            ]);
            setCapacidadesDisponibles(capsData);
            setSectoresDisponibles(sectsData);
        };
        cargarDatos();
    }, []);

    useEffect(() => {
        if (editando && id) {
            const cargarEmpleado = async () => {
                const data = await getEmpleadoById(id);
                reset({
                    dni: data.dni,
                    nombre: data.nombre,
                    apellido: data.apellido,
                    activo: data.activo,
                    listaCapacidades: data.capacidades ? data.capacidades.map((c) => c.id) : [],
                    listaSectores: data.sectores ? data.sectores.map((s) => s.id) : []
                });
            };
            cargarEmpleado();
        }
    }, [id, editando, reset]);

    const handleCapacidadChange = (capId: number) => {
        if (capacidadesActuales.includes(capId)) {
            setValue('listaCapacidades', capacidadesActuales.filter(c => c !== capId));
        } else {
            setValue('listaCapacidades', [...capacidadesActuales, capId]);
        }
    };

    const handleSectorChange = (secId: number) => {
        if (sectoresActuales.includes(secId)) {
            setValue('listaSectores', sectoresActuales.filter(s => s !== secId));
        } else {
            setValue('listaSectores', [...sectoresActuales, secId]);
        }
    };

    const onSubmit = async (data: FormValues) => {
        const sectoresResponsable = sectoresDisponibles
            .filter(s => s.responsable_id === idNum)
            .map(s => s.id);

        const sectoresFinales = Array.from(new Set([...data.listaSectores, ...sectoresResponsable]));

        const datosGenerados: EmpleadoPayload = { 
            dni: data.dni,
            nombre: data.nombre, 
            apellido: data.apellido, 
            activo: data.activo,
            listaCapacidades: data.listaCapacidades.length > 0 ? data.listaCapacidades : null,
            listaSectores: sectoresFinales.length > 0 ? sectoresFinales : null 
        };

        try {
            const exito = await saveEmpleado(datosGenerados, id);
            if (exito) navigate('/empleados');
            else alert('Error al guardar el registro. Verifica que el DNI no esté duplicado.');
        } catch (error) {
            console.error('Error de red:', error);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{editando ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className={styles.formularioTarjeta}>
                
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>DNI / CUIL:</label>
                        <input 
                            type="text" 
                            {...register('dni', { 
                                required: "El DNI/CUIL es obligatorio",
                                minLength: { value: 7, message: "Debe tener al menos 7 dígitos" },
                                maxLength: { value: 11, message: "No puede superar los 11 dígitos" },
                                pattern: { value: /^[0-9]+$/, message: "Solo se permiten números" },
                                validate: (value) => value.trim().length > 0 || "No puede estar vacío o contener solo espacios"
                            })}
                            style={errors.dni ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        />
                        {errors.dni && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.dni.message}</span>}
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Nombre:</label>
                        <input 
                            type="text" 
                            {...register('nombre', { 
                                required: "El nombre es obligatorio",
                                minLength: { value: 2, message: "Debe tener al menos 2 letras" },
                                maxLength: { value: 50, message: "No puede superar las 50 letras" },
                                pattern: { value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, message: "Solo se permiten letras" },
                                validate: (value) => value.trim().length > 0 || "No puede estar vacío o contener solo espacios"
                            })} 
                            style={errors.nombre ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        />
                        {errors.nombre && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.nombre.message}</span>}
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Apellido:</label>
                        <input 
                            type="text" 
                            {...register('apellido', { 
                                required: "El apellido es obligatorio",
                                minLength: { value: 2, message: "Debe tener al menos 2 letras" },
                                maxLength: { value: 50, message: "No puede superar las 50 letras" },
                                pattern: { value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, message: "Solo se permiten letras" },
                                validate: (value) => value.trim().length > 0 || "No puede estar vacío o contener solo espacios"
                            })} 
                            style={errors.apellido ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        />
                        {errors.apellido && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.apellido.message}</span>}
                    </div>

                    {editando && (
                        <div className={styles.formGroup} style={{ justifyContent: 'center' }}>
                            <label className={styles.filaCheckbox} style={{ width: '100%', cursor: 'pointer', margin: 0, marginTop: '22px' }}>
                                <input 
                                    type="checkbox" 
                                    className={styles.checkbox}
                                    {...register('activo')}
                                />
                                <span className={styles.labelCheckbox}>Empleado Activo</span>
                            </label>
                        </div>
                    )}
                </div>

                {/* --- SECCIÓN DE CAPACIDADES --- */}
                <div className={styles.bloqueCapacidades} style={{ width: '100%', marginTop: '15px' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Roles y Capacidades:</label>
                    <div className={styles.formGrid}>
                        {capacidadesDisponibles.map(cap => (
                            <div key={cap.id} className={styles.filaCheckbox}>
                                <input 
                                    type="checkbox" 
                                    id={`cap-${cap.id}`} 
                                    className={styles.checkbox}
                                    checked={capacidadesActuales.includes(cap.id)} 
                                    onChange={() => handleCapacidadChange(cap.id)} 
                                />
                                <label htmlFor={`cap-${cap.id}`} className={styles.labelCheckbox}>
                                    {cap.nombre}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- SECCIÓN DE SECTORES --- */}
                <div className={styles.bloqueCapacidades} style={{ width: '100%', marginTop: '15px' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Asignación de Sectores:</label>
                    <div className={styles.formGrid}>
                        {sectoresDisponibles.length > 0 ? sectoresDisponibles.map(sec => {
                            const esResponsable = sec.responsable_id === idNum;
                            const estaSeleccionado = sectoresActuales.includes(sec.id) || esResponsable;

                            return (
                                <div key={sec.id} className={styles.filaCheckbox} style={esResponsable ? { opacity: 0.8 } : {}}>
                                    <input 
                                        type="checkbox" 
                                        id={`sec-${sec.id}`} 
                                        className={styles.checkbox}
                                        checked={estaSeleccionado} 
                                        disabled={esResponsable} 
                                        onChange={() => handleSectorChange(sec.id)} 
                                    />
                                    <label htmlFor={`sec-${sec.id}`} className={styles.labelCheckbox} style={{ display: 'flex', alignItems: 'center' }}>
                                        {sec.nombre} 
                                        {esResponsable && (
                                            <span style={{ fontSize: '0.75rem', color: '#0284c7', marginLeft: '8px', fontWeight: '600' }}>
                                                (Responsable)
                                            </span>
                                        )}
                                    </label>
                                </div>
                            );
                        }) : (
                            <span style={{ color: 'var(--text-muted)' }}>No hay sectores registrados aún.</span>
                        )}
                    </div>
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '25px' }}>
                    <Boton type="submit" variant="guardar">{editando ? 'Actualizar' : 'Guardar'}</Boton>
                    <Link to="/empleados"><Boton variant="eliminar">Cancelar</Boton></Link>
                </div>
            </form>
        </div>
    );
}