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
                : 'Registrar Nuevo Producto de Limpieza'}
        </h2>

        {error && (
            <p
                style={{
                    color: '#ef4444',
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
            <div
                className={styles.formGrid}
                style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
            >
                {/* Nombre */}
                <div className={styles.formGroup}>
                    <label htmlFor="nombre">
                        Nombre del Producto:
                    </label>
                    <input
                        id="nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                    />
                </div>

                {/* Tipo */}
                <div className={styles.formGroup}>
                    <label htmlFor="tipo">
                        Tipo de Producto:
                    </label>
                    <select
                        id="tipo"
                        value={tipo}
                        onChange={(e) =>
                            setTipo(e.target.value as TipoProductoLimpieza)
                        }
                    >
                        <option value="detergente">Detergente</option>
                        <option value="desinfectante">Desinfectante</option>
                        <option value="desengrasante">Desengrasante</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>

                {/* Stock */}
                <div className={styles.formGroup}>
                    <label htmlFor="stock">
                        Stock:
                    </label>
                    <input
                        id="stock"
                        type="number"
                        min="0"
                        value={stock}
                        onChange={(e) => setStock(Number(e.target.value))}
                    />
                </div>

                {/* Unidad de medida */}
                <div className={styles.formGroup}>
                    <label htmlFor="unidadMedida">
                        Unidad de Medida:
                    </label>
                    <select
                        id="unidadMedida"
                        value={unidadMedidaId}
                        onChange={(e) =>
                            setUnidadMedidaId(Number(e.target.value))
                        }
                    >
                        <option value={0}>
                            Seleccione una unidad...
                        </option>

                        {/* acá van tus opciones de unidades */}
                    </select>
                </div>
            </div>

            <div
                className={styles.filaBotones}
                style={{ marginTop: '20px' }}
            >
                <Boton
                    type="submit"
                    variant="guardar"
                    disabled={guardando}
                >
                    {guardando
                        ? 'Guardando...'
                        : esEdicion
                            ? 'Actualizar Cambios'
                            : 'Guardar'}
                </Boton>

                <Boton
                    type="button"
                    variant="eliminar"
                    onClick={() => navigate('/productosLimpieza')}
                >
                    Cancelar
                </Boton>
            </div>
        </form>
    </div>
    );
}

export default ProductoLimpiezaForm;