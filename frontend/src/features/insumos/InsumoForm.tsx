import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { UnidadMedida } from '../../types/unidadesMedida';
import type { InsumoPayload } from '../../types/insumos';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import { getInsumoById, saveInsumo } from '../../services/insumosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

interface FormValues {
    nombre: string;
    unidad_medida_id: number;
}

export default function InsumoForm() {
    const [unidadesDisponibles, setUnidadesDisponibles] = useState<UnidadMedida[]>([]);
    
    const navigate = useNavigate();
    const { id } = useParams();
    const editando = Boolean(id);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            nombre: ''
        }
    });

    useEffect(() => {
        const cargarUnidades = async () => {
            try {
                const data = await getUnidadesMedida();
                setUnidadesDisponibles(data);
            } catch (err) {
                console.error("Error al cargar unidades de medida:", err);
            }
        };
        cargarUnidades(); 
    }, []);

    useEffect(() => {
        if (editando && id) {
            const cargarInsumo = async () => {
                try {
                    const data = await getInsumoById(id);
                    reset({
                        nombre: data.nombre,
                        unidad_medida_id: data.unidad_medida_id
                    });
                } catch (err) {
                    console.error("Error al cargar insumo:", err);
                }
            };
            cargarInsumo();
        }
    }, [id, editando, reset]);

    const onSubmit = async (data: FormValues) => {
        const nombreLimpio = data.nombre.trim();
        if (!nombreLimpio) return;

        const datos: InsumoPayload = { 
            nombre: nombreLimpio, 
            unidad_medida_id: Number(data.unidad_medida_id)
        };

        try {
            const exito = await saveInsumo(datos, id);
            if (exito) {
                navigate('/insumos');
            } else {
                alert('Hubo un error al guardar el registro.');
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{editando ? 'Editar Insumo' : 'Registrar Nuevo Insumo'}</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className={styles.formularioTarjeta} style={{ maxWidth: '600px' }}>
                <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr' }}>
                    <div className={styles.formGroup}>
                        <label>Nombre del Insumo:</label>
                        <input 
                            type="text" 
                            {...register('nombre', { 
                                required: "El nombre es obligatorio",
                                validate: (value) => value.trim().length >= 2 || "No puede contener solo espacios o estar vacío",
                                maxLength: { value: 100, message: "No puede superar los 100 caracteres" }
                            })} 
                            style={errors.nombre ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        />
                        {errors.nombre && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.nombre.message}</span>}
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Unidad de Medida:</label>
                        <select 
                            {...register('unidad_medida_id', { 
                                required: "Debe seleccionar una unidad de medida",
                                valueAsNumber: true,
                                validate: value => !isNaN(value) || "Debe seleccionar una unidad válida"
                            })} 
                            style={errors.unidad_medida_id ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        >
                            <option value="">Seleccione una unidad...</option>
                            {unidadesDisponibles.map(unidad => (
                                <option key={unidad.id} value={unidad.id}>
                                    {unidad.nombre}
                                </option>
                            ))}
                        </select>
                        {errors.unidad_medida_id && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.unidad_medida_id.message}</span>}
                    </div>
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                    <Boton type="submit" variant="guardar">
                        {editando ? 'Actualizar Cambios' : 'Guardar'}
                    </Boton>
                    <Link to="/insumos">
                        <Boton variant="eliminar">
                            Cancelar
                        </Boton>
                    </Link>
                </div>
            </form>
        </div>
    );
}