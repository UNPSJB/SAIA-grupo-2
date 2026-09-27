import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

import type {
    ProductoLimpiezaPayload,
    TipoProductoLimpieza,
} from '../../types/productosLimpieza';
import type { UnidadMedida } from '../../types/unidadesMedida';

import {
    getProductoLimpiezaById,
    saveProductoLimpieza,
} from '../../services/productosLimpiezaServices';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';

import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

const tiposProducto: TipoProductoLimpieza[] = [
    'detergente',
    'desinfectante',
    'desengrasante',
    'otro',
];

interface Errores {
    nombre?: string;
    stock?: string;
    unidad_medida_id?: string;
}

export default function ProductoLimpiezaForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const editando = Boolean(id);

    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState<TipoProductoLimpieza>('otro');
    const [stock, setStock] = useState('0');
    const [unidadMedidaId, setUnidadMedidaId] = useState('0');

    const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedida[]>([]);
    const [errores, setErrores] = useState<Errores>({});
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    const yaCargado = useRef(false);

    useEffect(() => {
        if (yaCargado.current) return;
        yaCargado.current = true;

        const cargarDatos = async () => {
            try {
                const unidades = await getUnidadesMedida();
                setUnidadesMedida(unidades);

                if (id) {
                    const producto = await getProductoLimpiezaById(id);
                    setNombre(producto.nombre);
                    setTipo(producto.tipo);
                    setStock(String(producto.stock));
                    setUnidadMedidaId(String(producto.unidad_medida_id));
                }
            } catch (err) {
                console.error('Error al cargar los datos del formulario:', err);
                setErrorCarga('No se pudieron cargar los datos.');
            }
        };

        cargarDatos();
    }, [id]);

    const validar = (): Errores => {
        const nuevos: Errores = {};

        if (!nombre.trim()) {
            nuevos.nombre = 'El nombre es obligatorio';
        } else if (nombre.trim().length < 2) {
            nuevos.nombre = 'Debe tener al menos 2 caracteres';
        } else if (nombre.trim().length > 100) {
            nuevos.nombre = 'No puede superar los 100 caracteres';
        }

        const stockNumero = Number(stock);
        if (stock.trim() === '' || Number.isNaN(stockNumero)) {
            nuevos.stock = 'El stock es obligatorio';
        } else if (stockNumero < 0) {
            nuevos.stock = 'Debe ser mayor o igual a cero';
        }

        if (Number(unidadMedidaId) === 0) {
            nuevos.unidad_medida_id = 'Debe seleccionar una unidad de medida';
        }

        return nuevos;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const nuevosErrores = validar();
        setErrores(nuevosErrores);

        if (Object.keys(nuevosErrores).length > 0) return;

        const datos: ProductoLimpiezaPayload = {
            nombre: nombre.trim(),
            tipo,
            stock: Number(stock),
            unidad_medida_id: Number(unidadMedidaId),
        };

        try {
            setGuardando(true);
            const exito = await saveProductoLimpieza(datos, id);

            if (exito) {
                navigate('/productosLimpieza');
            } else {
                alert('Hubo un error al guardar el registro.');
            }
        } catch (err) {
            console.error('Error de red:', err);
            alert('Hubo un error al guardar el registro.');
        } finally {
            setGuardando(false);
        }
    };

    const estiloError = { borderColor: '#ef4444', outline: 'none' };
    const estiloMensaje = { color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>
                {editando
                    ? 'Editar Producto de Limpieza'
                    : 'Registrar Nuevo Producto de Limpieza'}
            </h2>

            {errorCarga && (
                <p style={{ color: '#ef4444' }}>{errorCarga}</p>
            )}

            <form
                onSubmit={handleSubmit}
                className={styles.formularioTarjeta}
                style={{ maxWidth: '700px' }}
            >
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label>Nombre:</label>
                        <input
                            type="text"
                            placeholder="Ej: Detergente concentrado"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            style={errores.nombre ? estiloError : {}}
                        />
                        {errores.nombre && <span style={estiloMensaje}>{errores.nombre}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label>Tipo:</label>
                        <select
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value as TipoProductoLimpieza)}
                        >
                            {tiposProducto.map((tipoProducto) => (
                                <option key={tipoProducto} value={tipoProducto}>
                                    {tipoProducto}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Stock:</label>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Cantidad disponible"
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            style={errores.stock ? estiloError : {}}
                        />
                        {errores.stock && <span style={estiloMensaje}>{errores.stock}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label>Unidad de medida:</label>
                        <select
                            value={unidadMedidaId}
                            onChange={(e) => setUnidadMedidaId(e.target.value)}
                            style={errores.unidad_medida_id ? estiloError : {}}
                        >
                            <option value="0">Seleccione una unidad</option>
                            {unidadesMedida.map((unidad) => (
                                <option key={unidad.id} value={String(unidad.id)}>
                                    {unidad.nombre}
                                </option>
                            ))}
                        </select>
                        {errores.unidad_medida_id && (
                            <span style={estiloMensaje}>{errores.unidad_medida_id}</span>
                        )}
                    </div>
                </div>

                <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                    <Boton type="submit" variant="guardar" disabled={guardando}>
                        {guardando
                            ? 'Guardando...'
                            : editando
                                ? 'Actualizar Cambios'
                                : 'Guardar'}
                    </Boton>
                    <Link to="/productosLimpieza">
                        <Boton variant="volver">Cancelar</Boton>
                    </Link>
                </div>
            </form>
        </div>
    );
}
