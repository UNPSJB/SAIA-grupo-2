import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { EquipoPayload, TipoEquipo } from '../../types/equipos';
import type { Sector } from '../../types/sectores';
import { getEquipoById, saveEquipo, getTiposEquipo } from '../../services/equiposServices';
import { getSectores } from '../../services/sectoresServices'; 
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

interface FormValues {
    nombre: string;
    activo: boolean;
    tipo_id: number;
    sector_id: number; 
}

export default function EquipoForm() {
    const [tiposDisponibles, setTiposDisponibles] = useState<TipoEquipo[]>([]);
    const [sectoresDisponibles, setSectoresDisponibles] = useState<Sector[]>([]); 
    
    const navigate = useNavigate();
    const { id } = useParams();
    const editando = Boolean(id);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            nombre: '',
            activo: true,
        }
    });

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [tiposData, sectoresData] = await Promise.all([
                    getTiposEquipo(),
                    getSectores()
                ]);
                setTiposDisponibles(tiposData);
                setSectoresDisponibles(sectoresData);
            } catch (err) {
                console.error("Error al cargar datos:", err);
            }
        };
        cargarDatos();
    }, []);

    useEffect(() => {
        if (editando && id) {
            const cargarEquipo = async () => {
                try {
                    const data = await getEquipoById(id);
                    reset({
                        nombre: data.nombre,
                        activo: data.activo,
                        tipo_id: data.tipo.id,
                        sector_id: data.sector.id 
                    });
                } catch (err) {
                    console.error("Error al cargar equipo:", err);
                }
            };
            cargarEquipo();
        }
    }, [id, editando, reset]);

    const onSubmit = async (data: FormValues) => {
        const datos: EquipoPayload = { 
            nombre: data.nombre, 
            activo: data.activo, 
            tipo_id: data.tipo_id,
            sector_id: data.sector_id 
        };

        try {
            const exito = await saveEquipo(datos, id);
            if (exito) {
                navigate('/equipos');
            } else {
                alert('Hubo un error al guardar el registro.');
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{editando ? 'Editar Equipo' : 'Registrar Nuevo Equipo'}</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className={styles.formularioTarjeta}>
                
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Nombre del Equipo:</label>
                        <input 
                            type="text" 
                            {...register('nombre', { 
                                required: "El nombre es obligatorio",
                                minLength: { value: 3, message: "Debe tener al menos 3 caracteres" },
                                maxLength: { value: 100, message: "No puede superar los 100 caracteres" },
                                validate: (value) => value.trim().length > 0 || "No puede estar vacío o contener solo espacios"
                            })} 
                            style={errors.nombre ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        />
                        {errors.nombre && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.nombre.message}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label>Categoría:</label>
                        <select 
                            {...register('tipo_id', { 
                                required: "Debe seleccionar una categoría",
                                valueAsNumber: true,
                                validate: value => !isNaN(value) || "Debe seleccionar una categoría"
                            })} 
                            style={errors.tipo_id ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        >
                            <option value="">Seleccione un tipo...</option>
                            {tiposDisponibles.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.nombre}
                                </option>
                            ))}
                        </select>
                        {errors.tipo_id && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.tipo_id.message}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label>Ubicación / Sector:</label>
                        <select 
                            {...register('sector_id', { 
                                required: "Debe seleccionar un sector",
                                valueAsNumber: true,
                                validate: value => !isNaN(value) || "Debe seleccionar un sector"
                            })} 
                            style={errors.sector_id ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        >
                            <option value="">Seleccione un sector...</option>
                            {sectoresDisponibles.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.nombre}
                                </option>
                            ))}
                        </select>
                        {errors.sector_id && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.sector_id.message}</span>}
                    </div>

                    <div className={styles.formGroup} style={{ justifyContent: 'center' }}>
                        <label className={styles.filaCheckbox} style={{ width: '100%', cursor: 'pointer', margin: 0, marginTop: '22px' }}>
                            <input 
                                type="checkbox" 
                                className={styles.checkbox}
                                {...register('activo')}
                            />
                            <span className={styles.labelCheckbox}>Equipo Operativo</span>
                        </label>
                    </div>
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                    <Boton type="submit" variant="guardar">
                        {editando ? 'Actualizar Cambios' : 'Guardar'}
                    </Boton>
                    <Link to="/equipos">
                        <Boton variant="eliminar">
                            Cancelar
                        </Boton>
                    </Link>
                </div>
            </form>
        </div>
    );
}