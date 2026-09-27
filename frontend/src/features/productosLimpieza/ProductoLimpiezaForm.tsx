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
    const [tipo, setTipo] = useState<TipoProductoLimpieza>('otro');
    const [stock, setStock] = useState(0);
    const [unidadMedidaId, setUnidadMedidaId] = useState<number>(0);

    const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedida[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    const esEdicion = Boolean(id);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const unidades = await getUnidadesMedida();
                setUnidadesMedida(unidades);

                if (id) {
                    const producto = await getProductoLimpiezaById(id);

                    setNombre(producto.nombre);
                    setTipo(producto.tipo);
                    setStock(producto.stock);
                    setUnidadMedidaId(producto.unidad_medida_id);
                }
            } catch (err) {
                setError('No se pudieron cargar los datos.');
            }
        };

        cargarDatos();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
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
            setError('Debe seleccionar una unidad de medida.');
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

            const ok = await saveProductoLimpieza(datos, id);

            if (!ok) {
                throw new Error('No se pudo guardar el producto.');
            }

            navigate('/productosLimpieza');
        } catch (err) {
            setError('No se pudo guardar el producto de limpieza.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div>
            <h1>
                {esEdicion
                    ? 'Editar producto de limpieza'
                    : 'Nuevo producto de limpieza'}
            </h1>

            {error && <p>{error}</p>}

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="nombre">
                        Nombre
                    </label>

                    <input
                        id="nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="tipo">
                        Tipo
                    </label>

                    <select
                        id="tipo"
                        value={tipo}
                        onChange={(e) =>
                            setTipo(e.target.value as TipoProductoLimpieza)
                        }
                    >
                        {tiposProducto.map((tipoProducto) => (
                            <option
                                key={tipoProducto}
                                value={tipoProducto}
                            >
                                {tipoProducto}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
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
                            setStock(Number(e.target.value))
                        }
                    />
                </div>

                <div>
                    <label htmlFor="unidadMedida">
                        Unidad de medida
                    </label>

                    <select
                        id="unidadMedida"
                        value={unidadMedidaId}
                        onChange={(e) =>
                            setUnidadMedidaId(Number(e.target.value))
                        }
                    >
                        <option value={0}>
                            Seleccione una unidad
                        </option>

                        {unidadesMedida.map((unidad) => (
                            <option
                                key={unidad.id}
                                value={unidad.id}
                            >
                                {unidad.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <button type="submit" disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar'}
                </button>

                <button
                    type="button"
                    onClick={() => navigate('/productosLimpieza')}
                >
                    Cancelar
                </button>
            </form>
        </div>
    );
}

export default ProductoLimpiezaForm;