import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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

function ProductoLimpiezaForm() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] =
        useState<TipoProductoLimpieza>('otro');
    const [stock, setStock] = useState(0);
    const [unidadMedidaId, setUnidadMedidaId] =
        useState<number>(0);

    const [unidadesMedida, setUnidadesMedida] =
        useState<UnidadMedida[]>([]);

    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    const esEdicion = Boolean(id);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const unidades = await getUnidadesMedida();
                setUnidadesMedida(unidades);

                if (id) {
                    const producto =
                        await getProductoLimpiezaById(id);

                    setNombre(producto.nombre);
                    setTipo(producto.tipo);
                    setStock(producto.stock);
                    setUnidadMedidaId(
                        producto.unidad_medida_id
                    );
                }
            } catch (err) {
                setError(
                    'No se pudieron cargar los datos.'
                );
            }
        };

        cargarDatos();
    }, [id]);

    const handleSubmit = async (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        if (!nombre.trim()) {
            setError('El nombre es obligatorio.');
            return;
        }

        if (stock < 0) {
            setError('El stock no puede ser negativo.');
            return;
        }

        if (unidadMedidaId === 0) {
            setError(
                'Debe seleccionar una unidad de medida.'
            );
            return;
        }

        const datos: ProductoLimpiezaPayload = {
            nombre: nombre.trim(),
            tipo,
            stock,
            unidad_medida_id: unidadMedidaId,
        };

        try {
            setGuardando(true);
            setError(null);

            const ok = await saveProductoLimpieza(
                datos,
                id
            );

            if (!ok) {
                throw new Error(
                    'No se pudo guardar el producto.'
                );
            }

            navigate('/productosLimpieza');
        } catch (err) {
            setError(
                'No se pudo guardar el producto de limpieza.'
            );
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>
                {esEdicion
                    ? 'Editar Producto de Limpieza'
                    : 'Registrar Producto de Limpieza'}
            </h2>

            <div className={styles.contenedorPrincipal}>
            <h2>
                {esEdicion
                    ? 'Editar Producto de Limpieza'
                    : 'Registrar Producto de Limpieza'}
            </h2>
                {error && (
                    <p
                        style={{
                            color: 'var(--text-h)',
                            textAlign: 'center',
                        }}
                    >
                        {error}
                    </p>
                )}

                <form
                    onSubmit={handleSubmit}
                    className={styles.formularioTarjeta}
                    style={{ maxWidth: '800px' }}
                >
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label htmlFor="nombre">
                                Nombre
                            </label>

                            <input
                                id="nombre"
                                type="text"
                                value={nombre}
                                onChange={(e) =>
                                    setNombre(
                                        e.target.value
                                    )
                                }
                                placeholder="Ej. Detergente"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="tipo">
                                Tipo
                            </label>

                            <select
                                id="tipo"
                                value={tipo}
                                onChange={(e) =>
                                    setTipo(
                                        e.target.value as TipoProductoLimpieza
                                    )
                                }
                            >
                                {tiposProducto.map(
                                    (tipoProducto) => (
                                        <option
                                            key={tipoProducto}
                                            value={
                                                tipoProducto
                                            }
                                        >
                                            {tipoProducto
                                                .charAt(0)
                                                .toUpperCase() +
                                                tipoProducto.slice(
                                                    1
                                                )}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="stock">
                                Stock
                            </label>

                            <input
                                id="stock"
                                type="number"
                                min="0"
                                step="any"
                                value={stock}
                                onChange={(e) =>
                                    setStock(
                                        Number(
                                            e.target.value
                                        )
                                    )
                                }
                                placeholder="0"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="unidadMedida">
                                Unidad de medida
                            </label>

                            <select
                                id="unidadMedida"
                                value={unidadMedidaId}
                                onChange={(e) =>
                                    setUnidadMedidaId(
                                        Number(
                                            e.target.value
                                        )
                                    )
                                }
                            >
                                <option value={0}>
                                    Seleccione una unidad
                                </option>

                                {unidadesMedida.map(
                                    (unidad) => (
                                        <option
                                            key={unidad.id}
                                            value={unidad.id}
                                        >
                                            {unidad.nombre}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>

                    <div className={styles.filaBotones}>
                        <Boton
                            variant="crear"
                            type="submit"
                            disabled={guardando}
                        >
                            {guardando
                                ? 'Guardando...'
                                : 'Guardar'}
                        </Boton>

                        <Boton
                            variant="volver"
                            type="button"
                            onClick={() =>
                                navigate(
                                    '/productosLimpieza'
                                )
                            }
                        >
                            Cancelar
                        </Boton>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProductoLimpiezaForm;