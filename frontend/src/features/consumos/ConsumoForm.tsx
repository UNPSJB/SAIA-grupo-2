import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { saveConsumo } from '../../services/consumosServices';
import { getProductos } from '../../services/productosLimpiezaServices';
import type { ProductoLimpieza } from '../../types/productosLimpieza';
import { getTareas } from '../../services/tareasServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

interface FormValues {
   producto_limpieza_id: number;
    cantidad_consumida: number; 
    tarea_id: number;
    fecha_registro: string;
}

export default function ConsumoForm() {

    const [productoLimpieza, setProd] = useState<ProductoLimpieza[]>([])
    const [tareas, setTareas] = useState<any[]>([]);
    const navigate = useNavigate();
    
    const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            fecha_registro: new Date().toISOString().split('T')[0]
        }
    });

    useEffect(() => {

        getProductos().then(setProd);
        getTareas().then(setTareas);
    }, []);

    const onSubmit = async (data: FormValues) => {
        const payload = {
            ...data,
            producto_limpieza_id: Number(data.producto_limpieza_id),
           tarea_id: Number(data.tarea_id),
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
                        <select {...register('tarea_id', { required: "Seleccione una tarea" })}>
                            <option value="">Seleccione...</option>
                            {tareas.map(t => (
                                <option key={t.id} value={t.id}>{t.titulo}</option>
                            ))}
                        </select>
                        {errors.tarea_id && <span style={{color: 'red'}}>{errors.tarea_id.message}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label>Producto / Insumo:</label>
                        <select {...register('producto_limpieza_id', { required: "Seleccione un producto" })}>
                            <option value="">Seleccione...</option>
                            {productoLimpieza.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida.nombre})</option>)}
                        </select>
                        {errors.producto_limpieza_id && <span style={{color: 'red'}}>{errors.producto_limpieza_id.message}</span>}
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