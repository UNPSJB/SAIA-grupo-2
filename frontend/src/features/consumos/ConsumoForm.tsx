import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { saveConsumo } from '../../services/consumosServices';
import { getInsumos } from '../../services/insumosServices';
import type { Insumo } from '../../types/insumos';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

interface FormValues {
    insumo_id: number;
    cantidad_consumida: number;
    tarea_asociada: string;
    fecha_registro: string;
}

export default function ConsumoForm() {
    const [insumos, setInsumos] = useState<Insumo[]>([]);
    const navigate = useNavigate();
    
    const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            fecha_registro: new Date().toISOString().split('T')[0]
        }
    });

    useEffect(() => {
        getInsumos().then(setInsumos);
    }, []);

    const onSubmit = async (data: FormValues) => {
        const payload = {
            ...data,
            insumo_id: Number(data.insumo_id),
            cantidad_consumida: Number(data.cantidad_consumida)
        };
        const exito = await saveConsumo(payload);
        if (exito) {
            alert('Consumo registrado con éxito.');
            navigate('/');
        } else {
            alert('Error al registrar el consumo.');
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Registrar Consumo de Limpieza</h2>
            <form onSubmit={handleSubmit(onSubmit)} className={styles.formularioTarjeta}>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Fecha:</label>
                        <input type="date" {...register('fecha_registro', { required: true })} />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Tarea Asociada:</label>
                        <input type="text" {...register('tarea_asociada', { required: "Debe indicar la tarea" })} placeholder="Ej: Limpieza de cámara 1" />
                        {errors.tarea_asociada && <span style={{color: 'red'}}>{errors.tarea_asociada.message}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label>Producto / Insumo:</label>
                        <select {...register('insumo_id', { required: "Seleccione un producto" })}>
                            <option value="">Seleccione...</option>
                            {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida.nombre})</option>)}
                        </select>
                        {errors.insumo_id && <span style={{color: 'red'}}>{errors.insumo_id.message}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label>Cantidad Aproximada:</label>
                        <input type="number" step="0.01" {...register('cantidad_consumida', { required: true, min: 0.01 })} />
                    </div>
                </div>

                <div className={styles.filaBotones}>
                    <Boton type="submit" variant="guardar">Registrar Consumo</Boton>
                    <Link to="/"><Boton variant="eliminar">Cancelar</Boton></Link>
                </div>
            </form>
        </div>
    );
}