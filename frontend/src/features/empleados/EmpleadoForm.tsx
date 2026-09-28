import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { Capacidad } from '../../types/capacidades';
import type { Sector } from '../../types/sectores';
import type { EmpleadoPayload } from '../../types/empleados';
import { getCapacidades } from '../../services/capacidadesServices';
import { getSectores } from '../../services/sectoresServices';
import { getEmpleadoById, saveEmpleado } from '../../services/empleadosServices';
import { useAuth } from '../../context/AuthContext';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
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
    const { refreshUsuario } = useAuth();
    const [capacidadesDisponibles, setCapacidadesDisponibles] = useState<Capacidad[]>([]);
    const [sectoresDisponibles, setSectoresDisponibles] = useState<Sector[]>([]);
    const [errorSector, setErrorSector] = useState('');
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

    const navigate = useNavigate();
    const { id } = useParams();
    const editando = Boolean(id);

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

    const capacidadesActuales = watch('listaCapacidades') || [];
    const sectoresActuales = watch('listaSectores') || [];

    useEffect(() => {
        const cargarDatos = async () => {
            const [capsData, sectsData] = await Promise.all([
                getCapacidades(),
                getSectores()
            ]);
            setCapacidadesDisponibles(capsData);
            setSectoresDisponibles(sectsData);

            if (!editando) {
                const capOperario = capsData.find(c => c.nombre.toLowerCase().includes('operario')) || capsData[0];
                if (capOperario) {
                    setValue('listaCapacidades', [capOperario.id]);
                }
            }
        };
        cargarDatos();
    }, [editando, setValue]);

    useEffect(() => {
        if (editando && id) {
            const cargarEmpleado = async () => {
                const data = await getEmpleadoById(id);
                reset({
                    dni: data.dni,
                    nombre: data.nombre,
                    apellido: data.apellido,
                    activo: data.activo,
                    listaCapacidades: data.capacidades && data.capacidades.length > 0
                        ? data.capacidades.map((c) => c.id)
                        : [],
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
        let nuevos: number[];
        if (sectoresActuales.includes(secId)) {
            nuevos = sectoresActuales.filter(s => s !== secId);
        } else {
            nuevos = [...sectoresActuales, secId];
        }
        setValue('listaSectores', nuevos);
        if (nuevos.length > 0) {
            setErrorSector('');
        }
    };

    const onSubmit = async (data: FormValues) => {
        if (!data.listaSectores || data.listaSectores.length === 0) {
            setErrorSector('Debe seleccionar al menos 1 sector obligatoriamente.');
            return;
        }

        setErrorSector('');

        let capsFinales = data.listaCapacidades || [];
        if (capsFinales.length === 0) {
            const capOperario = capacidadesDisponibles.find(c => c.nombre.toLowerCase().includes('operario')) || capacidadesDisponibles[0];
            if (capOperario) {
                capsFinales = [capOperario.id];
            }
        }

        const datosGenerados: EmpleadoPayload = { 
            dni: data.dni,
            nombre: data.nombre, 
            apellido: data.apellido, 
            activo: data.activo,
            listaCapacidades: capsFinales,
            listaSectores: data.listaSectores
        };

        try {
            const exito = await saveEmpleado(datosGenerados, id);
            if (exito) {
                await refreshUsuario();
                navigate('/empleados');
            } else {
                setModalAlerta({
                    isOpen: true,
                    titulo: 'Error al Guardar',
                    mensaje: 'Error al guardar el registro. Verifica que el DNI no esté duplicado.'
                });
            }
        } catch (error) {
            console.error('Error de red:', error);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error de Red',
                mensaje: 'No se pudo conectar con el servidor.'
            });
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{editando ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className={styles.formularioTarjeta} autoComplete="off">
                
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>DNI / CUIL:</label>
                        <input 
                            type="text" 
                            autoComplete="off"
                            {...register('dni', { 
                                required: "El DNI/CUIL es obligatorio",
                                minLength: { value: 7, message: "Debe tener al menos 7 dígitos" },
                                maxLength: { value: 11, message: "No puede superar los 11 dígitos" },
                                pattern: { value: /^[0-9]+$/, message: "Solo se permiten números" },
                                validate: (value) => value.trim().length > 0 || "No puede estar vacío o contener solo espacios"
                            })}
                            style={errors.dni ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        />
                        {errors.dni && <span className={styles.textDanger}>{errors.dni.message}</span>}
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Nombre:</label>
                        <input 
                            type="text" 
                            autoComplete="off"
                            {...register('nombre', { 
                                required: "El nombre es obligatorio",
                                minLength: { value: 2, message: "Debe tener al menos 2 letras" },
                                maxLength: { value: 50, message: "No puede superar las 50 letras" },
                                pattern: { value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, message: "Solo se permiten letras" },
                                validate: (value) => value.trim().length > 0 || "No puede estar vacío o contener solo espacios"
                            })} 
                            style={errors.nombre ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        />
                        {errors.nombre && <span className={styles.textDanger}>{errors.nombre.message}</span>}
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Apellido:</label>
                        <input 
                            type="text" 
                            autoComplete="off"
                            {...register('apellido', { 
                                required: "El apellido es obligatorio",
                                minLength: { value: 2, message: "Debe tener al menos 2 letras" },
                                maxLength: { value: 50, message: "No puede superar las 50 letras" },
                                pattern: { value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, message: "Solo se permiten letras" },
                                validate: (value) => value.trim().length > 0 || "No puede estar vacío o contener solo espacios"
                            })} 
                            style={errors.apellido ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        />
                        {errors.apellido && <span className={styles.textDanger}>{errors.apellido.message}</span>}
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

                <div className={styles.bloqueCapacidades} style={{ width: '100%', marginTop: '15px' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Asignación de Sectores (Mínimo 1):</label>
                    <div className={styles.formGrid}>
                        {sectoresDisponibles.length > 0 ? sectoresDisponibles.map(sec => (
                            <div key={sec.id} className={styles.filaCheckbox}>
                                <input
                                    type="checkbox"
                                    id={`sec-${sec.id}`}
                                    className={styles.checkbox}
                                    checked={sectoresActuales.includes(sec.id)}
                                    onChange={() => handleSectorChange(sec.id)}
                                />
                                <label htmlFor={`sec-${sec.id}`} className={styles.labelCheckbox}>
                                    {sec.nombre}
                                </label>
                            </div>
                        )) : (
                            <span className={styles.textMuted}>No hay sectores registrados aún.</span>
                        )}
                    </div>
                    {errorSector && <span className={styles.textDanger} style={{ marginTop: '10px' }}>{errorSector}</span>}
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '25px' }}>
                    <Boton type="submit" variant="guardar">{editando ? 'Actualizar' : 'Guardar'}</Boton>
                    <Link to="/empleados"><Boton variant="eliminar">Cancelar</Boton></Link>
                </div>
            </form>

            <ModalAlerta
                isOpen={modalAlerta.isOpen}
                titulo={modalAlerta.titulo}
                mensaje={modalAlerta.mensaje}
                onClose={() => setModalAlerta({ ...modalAlerta, isOpen: false })}
            />
        </div>
    );
}
