import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { ProductoLimpieza } from '../../types/productosLimpieza';
import { getProductosLimpieza } from '../../services/productosLimpiezaServices';

function ProductosLimpiezaList() {
    const [productos, setProductos] = useState<ProductoLimpieza[]>([]);
    const [error, setError] = useState<string | null>(null);

    const cargarProductos = async () => {
        try {
            const data = await getProductosLimpieza();
            setProductos(data);
        } catch (err) {
            setError('No se pudieron cargar los productos de limpieza.');
        }
    };

    useEffect(() => {
        cargarProductos();
    }, []);

    if (error) {
        return <p>{error}</p>;
    }

    return (
        <div>
            <h1>Productos de limpieza</h1>

            <Link to="/productosLimpieza/nuevo">
                Nuevo producto de limpieza
            </Link>

            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Stock</th>
                        <th>Unidad de medida</th>
                        <th>Acciones</th>
                    </tr>
                </thead>

                <tbody>
                    {productos.map((producto) => (
                        <tr key={producto.id}>
                            <td>{producto.id}</td>
                            <td>{producto.nombre}</td>
                            <td>{producto.tipo}</td>
                            <td>{producto.stock}</td>
                            <td>{producto.unidad_medida.nombre}</td>

                            <td>
                                <Link
                                    to={`/productosLimpieza/${producto.id}`}
                                >
                                    Ver
                                </Link>{' '}

                                <Link
                                    to={`/productosLimpieza/editar/${producto.id}`}
                                >
                                    Editar
                                </Link>{' '}

                                <Link
                                    to={`/productosLimpieza/eliminar/${producto.id}`}
                                >
                                    Eliminar
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ProductosLimpiezaList;