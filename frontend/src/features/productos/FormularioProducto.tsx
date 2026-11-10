import { useEffect, useState, type FormEvent } from 'react';

import type { Producto, TipoProducto } from '../../types/productos';
import type { UnidadMedida } from '../../types/unidadesMedida';
import { getProductoById, saveProducto } from '../../services/productosServices';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import Boton from '../../components/Boton';
import { ETIQUETA_TIPO_PRODUCTO, TIPOS_PRODUCTO } from './formatoProducto';
import styles from '../../styles/shared.module.css';

interface Errores {
    nombre?: string;
    tipo?: string;
    stock?: string;
    unidadMedidaId?: string;
}

interface FormularioProductoProps {
    productoId?: string;
    nombreInicial?: string;
    enModal?: boolean;
    onGuardado: (producto: Producto) => void;
    onCancelar: () => void;
}

const LARGO_MAXIMO_NOMBRE = 100;

const estiloError = { borderColor: '#ef4444', outline: 'none' };
const estiloMensaje = { color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' };

export default function FormularioProducto({
    productoId,
    nombreInicial = '',
    enModal = false,
    onGuardado,
    onCancelar,
}: FormularioProductoProps) {
    const editando = Boolean(productoId);

    const [nombre, setNombre] = useState(nombreInicial);
    const [tipo, setTipo] = useState<TipoProducto | ''>('');
    const [stock, setStock] = useState('0');
    const [unidadMedidaId, setUnidadMedidaId] = useState('');

    const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
    const [errores, setErrores] = useState<Errores>({});
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let cancelado = false;

        const cargar = async () => {
            try {
                const [unidadesData, producto] = await Promise.all([
                    getUnidadesMedida(),
                    productoId ? getProductoById(productoId) : Promise.resolve(null),
                ]);
                if (cancelado) return;
                setUnidades(unidadesData);
                if (producto) {
                    setNombre(producto.nombre);
                    setTipo(producto.tipo);
                    setStock(String(producto.stock));
                    setUnidadMedidaId(String(producto.unidad_medida_id));
                }
            } catch (error) {
                console.error('Error al cargar los datos del producto:', error);
                if (!cancelado) setErrorCarga('No se pudieron cargar los datos del formulario.');
            }
        };

        void cargar();

        return () => {
            cancelado = true;
        };
    }, [productoId]);

    const validar = (): Errores => {
        const nuevos: Errores = {};
        const nombreLimpio = nombre.trim();

        if (!nombreLimpio) {
            nuevos.nombre = 'El nombre es obligatorio';
        } else if (nombreLimpio.length > LARGO_MAXIMO_NOMBRE) {
            nuevos.nombre = `No puede superar los ${LARGO_MAXIMO_NOMBRE} caracteres`;
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

        if (!unidadMedidaId) {
            nuevos.unidadMedidaId = 'Debe seleccionar una unidad de medida';
        }

        return nuevos;
    };

    const handleSubmit = async (evento: FormEvent) => {
        evento.preventDefault();
        evento.stopPropagation();

        const nuevosErrores = validar();
        setErrores(nuevosErrores);
        setErrorGuardado(null);
        if (Object.keys(nuevosErrores).length > 0 || !tipo) return;

        try {
            setGuardando(true);
            const producto = await saveProducto(
                {
                    nombre: nombre.trim(),
                    tipo,
                    stock: Number(stock),
                    unidad_medida_id: Number(unidadMedidaId),
                },
                productoId,
            );
            onGuardado(producto);
        } catch (error) {
            console.error('Error al guardar el producto:', error);
            setErrorGuardado(error instanceof Error ? error.message : 'No se pudo guardar el producto.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className={enModal ? undefined : styles.formularioTarjeta}
            style={enModal ? undefined : { maxWidth: '700px' }}
            noValidate
        >
            {errorCarga && <p style={{ color: '#ef4444', marginTop: 0 }}>{errorCarga}</p>}

            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="producto-nombre">Nombre:</label>
                    <input
                        id="producto-nombre"
                        type="text"
                        placeholder="Ej: Pan francés"
                        value={nombre}
                        maxLength={LARGO_MAXIMO_NOMBRE}
                        onChange={(evento) => setNombre(evento.target.value)}
                        style={errores.nombre ? estiloError : {}}
                        autoFocus={enModal}
                    />
                    {errores.nombre && <span style={estiloMensaje}>{errores.nombre}</span>}
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="producto-tipo">Tipo:</label>
                    <select
                        id="producto-tipo"
                        value={tipo}
                        onChange={(evento) => setTipo(evento.target.value as TipoProducto | '')}
                        style={errores.tipo ? estiloError : {}}
                    >
                        <option value="">Seleccione un tipo</option>
                        {TIPOS_PRODUCTO.map((opcion) => (
                            <option key={opcion} value={opcion}>
                                {ETIQUETA_TIPO_PRODUCTO[opcion]}
                            </option>
                        ))}
                    </select>
                    {errores.tipo && <span style={estiloMensaje}>{errores.tipo}</span>}
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="producto-unidad">Unidad de medida:</label>
                    <select
                        id="producto-unidad"
                        value={unidadMedidaId}
                        onChange={(evento) => setUnidadMedidaId(evento.target.value)}
                        style={errores.unidadMedidaId ? estiloError : {}}
                    >
                        <option value="">Seleccione una unidad</option>
                        {unidades.map((unidad) => (
                            <option key={unidad.id} value={String(unidad.id)}>
                                {unidad.nombre}
                            </option>
                        ))}
                    </select>
                    {errores.unidadMedidaId && <span style={estiloMensaje}>{errores.unidadMedidaId}</span>}
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="producto-stock">Stock:</label>
                    <input
                        id="producto-stock"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Cantidad disponible"
                        value={stock}
                        onChange={(evento) => setStock(evento.target.value)}
                        style={errores.stock ? estiloError : {}}
                    />
                    {errores.stock && <span style={estiloMensaje}>{errores.stock}</span>}
                </div>
            </div>

            {errorGuardado && (
                <p role="alert" style={{ color: '#ef4444', margin: '16px 0 0' }}>
                    {errorGuardado}
                </p>
            )}

            <div className={styles.filaBotones} style={{ marginTop: '20px' }}>
                <Boton type="submit" variant="guardar" disabled={guardando}>
                    {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Guardar'}
                </Boton>
                <Boton variant="eliminar" onClick={onCancelar}>
                    Cancelar
                </Boton>
            </div>
        </form>
    );
}
