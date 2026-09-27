import { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { ElementoLimpiezaPayload } from '../../types/elementosLimpieza';
import { getElementoLimpiezaById, saveElementoLimpieza } from '../../services/elementosLimpiezaServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

interface FormValues {
    nombre: string;
    frecuencia_recambio_dias: number | null;
}

export default function ElementoLimpiezaForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const editando = Boolean(id);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            nombre: '',
            frecuencia_recambio_dias: null
        }
    });

    useEffect(() => {
        if (editando && id) {
            const cargarElemento = async () => {
                try {
                    const data = await getElementoLimpiezaById(id);
                    reset({
                        nombre: data.nombre,
                        frecuencia_recambio_dias: data.frecuencia_recambio_dias
                    });
                } catch (err) {
                    console.error("Error al cargar elemento de limpieza:", err);
                }
            };
            cargarElemento();
        }
    }, [id, editando, reset]);

    const onSubmit = async (data: FormValues) => {
        const nombreLimpio = data.nombre.trim();
        if (!nombreLimpio) return;

        const datos: ElementoLimpiezaPayload = {
            nombre: nombreLimpio,
            frecuencia_recambio_dias: data.frecuencia_recambio_dias
        };

        try {
            const exito = await saveElementoLimpieza(datos, id);
            if (exito) {
                navigate('/elementosLimpieza');
            } else {
                alert('Hubo un error al guardar el registro.');
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{editando ? 'Editar Elemento de Limpieza' : 'Registrar Nuevo Elemento de Limpieza'}</h2>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.formularioTarjeta} style={{ maxWidth: '600px' }}>
                <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr' }}>
                    <div className={styles.formGroup}>
                        <label>Nombre del Elemento:</label>
                        <input
                            type="text"
                            placeholder="Ej: Cepillo de cerdas duras"
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
                        <label>Frecuencia de recambio recomendada (opcional):</label>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Cantidad de días. Dejar vacío si no aplica."
                            {...register('frecuencia_recambio_dias', {
                                setValueAs: (valor) => (valor === '' || valor === null ? null : Number(valor)),
                                validate: (valor) =>
                                    valor === null ||
                                    (Number.isInteger(valor) && valor > 0) ||
                                    "Debe ser un número entero mayor a cero"
                            })}
                            style={errors.frecuencia_recambio_dias ? { borderColor: '#ef4444', outline: 'none' } : {}}
                        />
                        {errors.frecuencia_recambio_dias && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.frecuencia_recambio_dias.message}</span>}
                    </div>
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                    <Boton type="submit" variant="guardar">
                        {editando ? 'Actualizar Cambios' : 'Guardar'}
                    </Boton>
                    <Link to="/elementosLimpieza">
                        <Boton variant="volver">
                            Cancelar
                        </Boton>
                    </Link>
                </div>
            </form>
        </div>
    );
}
