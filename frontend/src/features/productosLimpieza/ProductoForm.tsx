import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { ProductoLimpiezaPayload, TipoProductoLimpieza } from '../../types/productosLimpieza';
import type { UnidadMedida } from '../../types/unidadesMedida';
import { getProductoById, saveProducto } from '../../services/productosLimpiezaServices';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

interface FormValues {
    nombre: string;
    tipo: TipoProductoLimpieza | '';
    stock: number | '';
    unidad_medida_id: number | '';
}

export default function ProductoForm() {
    const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
    const [cargando, setCargando] = useState(true);
    const navigate = useNavigate();
    const { id } = useParams();
    const editando = Boolean(id);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            nombre: '',
            tipo: '',
            stock: 0,
            unidad_medida_id: ''
        }
    });

    useEffect(() => {
        const cargarTodo = async () => {
            setCargando(true);
            try {
                const unidadesData = await getUnidadesMedida();
                setUnidades(unidadesData);

                if (editando && id) {
                    const productoData = await getProductoById(id);
                    reset({
                        nombre: productoData.nombre,
                        tipo: productoData.tipo,
                        stock: productoData.stock,
                        unidad_medida_id: productoData.unidad_medida_id
                    });
                }
            } catch (error) {
                console.error("Error al cargar los datos del producto:", error);
            } finally {
                setCargando(false);
            }
        };
        
        cargarTodo();
    }, [id, editando, reset]);

    const onSubmit = async (data: FormValues) => {
        const payload: ProductoLimpiezaPayload = {
            nombre: data.nombre,
            tipo: data.tipo as TipoProductoLimpieza,
            stock: Number(data.stock),
            unidad_medida_id: Number(data.unidad_medida_id)
        };

        try {
            const exito = await saveProducto(payload, id);
            if (exito) navigate('/productos_limpieza');
        } catch (error) {
            console.error('Error al guardar el producto:', error);
        }
    };

    if (cargando) {
        return (
            <div className={styles.contenedorPrincipal}>
                <h2>{editando ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Cargando información del producto...
                </div>
            </div>
        );
    }

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>{editando ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className={styles.formularioTarjeta}>
                <div className={styles.formGroup}>
                    <label>Nombre del Producto:</label>
                    <input 
                        type="text" 
                        {...register('nombre', { 
                            required: "El nombre es obligatorio",
                            minLength: { value: 3, message: "Debe tener al menos 3 caracteres" },
                            validate: (value) => value.trim().length > 0 || "No puede estar vacío"
                        })} 
                        placeholder="Ej: Lavandina concentrada"
                        style={errors.nombre ? { borderColor: '#ef4444', outline: 'none' } : {}}
                    />
                    {errors.nombre && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.nombre.message}</span>}
                </div>

                <div className={styles.formGroup}>
                    <label>Tipo de Producto:</label>
                    <select 
                        {...register('tipo', { required: "Debe seleccionar un tipo" })}
                        style={errors.tipo ? { borderColor: '#ef4444', outline: 'none' } : {}}
                    >
                        <option value="">-- Seleccionar --</option>
                        <option value="detergente">Detergente</option>
                        <option value="desinfectante">Desinfectante</option>
                        <option value="desengrasante">Desengrasante</option>
                        <option value="otro">Otro</option>
                    </select>
                    {errors.tipo && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.tipo.message}</span>}
                </div>

                <div className={styles.formGroup}>
                    <label>Stock Inicial:</label>
                    <input 
                        type="number" 
                        step="0.01" 
                        {...register('stock', { 
                            required: "El stock es obligatorio",
                            min: { value: 0, message: "El stock no puede ser negativo" }
                        })} 
                        style={errors.stock ? { borderColor: '#ef4444', outline: 'none' } : {}}
                    />
                    {errors.stock && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.stock.message}</span>}
                </div>

                <div className={styles.formGroup}>
                    <label>Unidad de Medida:</label>
                    <select 
                        {...register('unidad_medida_id', { required: "Debe seleccionar una unidad de medida" })}
                        style={errors.unidad_medida_id ? { borderColor: '#ef4444', outline: 'none' } : {}}
                    >
                        <option value="">-- Seleccionar --</option>
                        {unidades.map(u => (
                            <option key={u.id} value={u.id}>{u.nombre}</option>
                        ))}
                    </select>
                    {errors.unidad_medida_id && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.unidad_medida_id.message}</span>}
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '30px' }}>
                    <Boton type="submit" variant="guardar">
                        {editando ? 'Actualizar Producto' : 'Guardar Producto'}
                    </Boton>
                    <Link to="/productos_limpieza">
                        <Boton variant="volver">Cancelar</Boton>
                    </Link>
                </div>
            </form>
        </div>
    );
}