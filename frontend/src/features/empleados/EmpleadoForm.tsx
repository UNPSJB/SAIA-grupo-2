import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { Capacidad } from '../../types/capacidades';
import type { EmpleadoPayload } from '../../types/empleados';
import { getCapacidades } from '../../services/capacidadesServices';
import { getEmpleadoById, saveEmpleado } from '../../services/empleadosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

interface FormValues {
    dni: string;
    nombre: string;
    apellido: string;
    activo: boolean;
    listaCapacidades: number[];
}

export default function EmpleadoForm() {
    const [capacidadesDisponibles, setCapacidadesDisponibles] = useState<Capacidad[]>([]);
    
    const navigate = useNavigate();
    const { id } = useParams();
    const editando = Boolean(id);

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            dni: '',
            nombre: '',
            apellido: '',
            activo: true,
            listaCapacidades: []
        }
    });

    const capacidadesActuales = watch('listaCapacidades');

    useEffect(() => {
        const cargarCapacidades = async () => {
            const data = await getCapacidades();
            setCapacidadesDisponibles(data);
        };
        cargarCapacidades();
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
                    listaCapacidades: data.capacidades ? data.capacidades.map((c) => c.id) : []
                });
            };
            cargarEmpleado();
        }
    }, [id, editando, reset]);

    const handleCheckboxChange = (capId: number) => {
        if (capacidadesActuales.includes(capId)) {
            setValue('listaCapacidades', capacidadesActuales.filter(c => c !== capId));
        } else {
            setValue('listaCapacidades', [...capacidadesActuales, capId]);
        }
    };

    const onSubmit = async (data: FormValues) => {
        const datosGenerados: EmpleadoPayload = { 
            dni: data.dni,
            nombre: data.nombre, 
            apellido: data.apellido, 
            activo: data.activo,
            listaCapacidades: data.listaCapacidades.length > 0 ? data.listaCapacidades : null 
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

                <div className={styles.bloqueCapacidades} style={{ width: '100%', marginTop: '10px' }}>
                    <label>Roles y Capacidades:</label>
                    <div className={styles.formGrid}>
                        {capacidadesDisponibles.map(cap => (
                            <div key={cap.id} className={styles.filaCheckbox}>
                                <input 
                                    type="checkbox" 
                                    id={`cap-${cap.id}`} 
                                    className={styles.checkbox}
                                    checked={capacidadesActuales.includes(cap.id)} 
                                    onChange={() => handleCheckboxChange(cap.id)} 
                                />
                                <label htmlFor={`cap-${cap.id}`} className={styles.labelCheckbox}>
                                    {cap.nombre}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                    <Boton type="submit" variant="guardar">{editando ? 'Actualizar' : 'Guardar'}</Boton>
                    <Link to="/empleados"><Boton variant="eliminar">Cancelar</Boton></Link>
                </div>
            </form>
        </div>
    );
}