import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

import type { ProductoLimpiezaPayload, TipoProductoLimpieza } from '../../types/productosLimpieza';
import type { UnidadMedida } from '../../types/unidadesMedida';
import { getProductoById, saveProducto } from '../../services/productosLimpiezaServices';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import Boton from '../../components/Boton';
import ModalAlerta from '../../components/alerta';
import styles from '../../styles/shared.module.css';

const tiposProducto: TipoProductoLimpieza[] = [
    'detergente',
    'desinfectante',
    'desengrasante',
    'otro',
];

interface Errores {
    nombre?: string;
    tipo?: string;
    stock?: string;
    unidad_medida_id?: string;
}

export default function ProductoForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const editando = Boolean(id);
    const [modalAlerta, setModalAlerta] = useState({ isOpen: false, titulo: '', mensaje: '' });

    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState<string>('');
    const [stock, setStock] = useState('0');
    const [unidadMedidaId, setUnidadMedidaId] = useState('0');

    const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
    const [errores, setErrores] = useState<Errores>({});
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    const yaCargado = useRef(false);

    useEffect(() => {
        if (yaCargado.current) return;
        yaCargado.current = true;

        const cargarTodo = async () => {
            try {
                const unidadesData = await getUnidadesMedida();
                setUnidades(unidadesData);

                if (id) {
                    const producto = await getProductoById(id);
                    setNombre(producto.nombre);
                    setTipo(producto.tipo);
                    setStock(String(producto.stock));
                    setUnidadMedidaId(String(producto.unidad_medida_id));
                }
            } catch (error) {
                console.error('Error al cargar los datos del formulario:', error);
                setErrorCarga('No se pudieron cargar los datos.');
            }
        };

        cargarTodo();
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

        if (!tipo) {
            nuevos.tipo = 'Debe seleccionar un tipo';
        }

        const stockNumero = Number(stock);
        if (stock.trim() === '' || Number.isNaN(stockNumero)) {
            nuevos.stock = 'El stock es obligatorio';
        } else if (stockNumero < 0) {
            nuevos.stock = 'El stock no puede ser negativo';
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
            tipo: tipo as TipoProductoLimpieza,
            stock: Number(stock),
            unidad_medida_id: Number(unidadMedidaId),
        };

        try {
            setGuardando(true);
            const exito = await saveProducto(datos, id);

            if (exito) {
                navigate('/productos_limpieza');
            } else {
                setModalAlerta({
                    isOpen: true,
                    titulo: 'Error al Guardar',
                    mensaje: 'Hubo un error al guardar el registro.'
                });
            }
        } catch (error) {
            console.error('Error de red:', error);
            setModalAlerta({
                isOpen: true,
                titulo: 'Error de Red',
                mensaje: 'Hubo un error de conexión al intentar guardar.'
            });
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

            {errorCarga && <p style={{ color: '#ef4444' }}>{errorCarga}</p>}

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
                            onChange={(e) => setTipo(e.target.value)}
                            style={errores.tipo ? estiloError : {}}
                        >
                            <option value="">Seleccione un tipo</option>
                            {tiposProducto.map((tipoProducto) => (
                                <option key={tipoProducto} value={tipoProducto}>
                                    {tipoProducto}
                                </option>
                            ))}
                        </select>
                        {errores.tipo && <span style={estiloMensaje}>{errores.tipo}</span>}
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
                            {unidades.map((unidad) => (
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
                    <Link to="/productos_limpieza">
                        <Boton variant="volver">Cancelar</Boton>
                    </Link>
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
