import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { ProductoLimpieza } from '../../types/productosLimpieza';
import { getProductos } from '../../services/productosLimpiezaServices';
import Boton from '../../components/Boton';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/shared.module.css';

import BuscadorTexto from '../../components/BuscadorTexto';
import { filtrarPorTexto } from '../../utils/texto';

import TablaPaginada, { type Columna } from '../../components/TablaPaginada';
import EncabezadoPagina from '../../components/EncabezadoPagina';

export default function ProductosList() {
    const { usuario } = useAuth();
    const [productos, setProductos] = useState<ProductoLimpieza[]>([]);

    const [busqueda, setBusqueda] = useState('');
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getProductos();
                setProductos(data);
            } catch (error) {
                console.error("Error al cargar productos:", error);
            }
        };
        cargarDatos();
    }, []);

    const productosFiltrados = filtrarPorTexto(productos, busqueda, (c) => [c.nombre, c.tipo, c.unidad_medida?.nombre]);

    const misColumnas: Columna<ProductoLimpieza>[] = [
        {
            key: 'nombre',
            encabezado: 'Nombre',
            ordenable: true,
            render: (producto) => <span style={{ fontWeight: '500' }}>{producto.nombre}</span>
        },
        {
            key: 'tipo',
            encabezado: 'Tipo',
            ordenable: true,
            //aca podria poner el ordenamiento para que si es otro se vaya al fondo
            render: (producto) => <span style={{ textTransform: 'capitalize' }}>{producto.tipo}</span>
        },
        {
            key: 'stock',
            encabezado: 'Stock Actual',
            ordenable: true,
            render: (producto) => (
                <span style={{ 
                    color: producto.stock <= 0 ? '#dc2626' : 'inherit', 
                    fontWeight: producto.stock <= 0 ? 'bold' : 'normal' 
                }}>
                    {producto.stock} {producto.unidad_medida?.nombre || ''}
                    {producto.stock <= 0 && " (Sin stock)"}
                </span>
            )
        },
        {
            key: 'acciones',
            encabezado: 'Acciones',
            render: (producto) => (
                <div className={styles.grupoBotonesTabla}>
                    {usuario?.rol === 'admin' && (
                        <>
                            <Link to={`/productos_limpieza/editar/${producto.id}`}>
                                <Boton variant="editar" />
                            </Link>
                            <Link to={`/productos_limpieza/eliminar/${producto.id}`}>
                                <Boton variant="eliminar" />
                            </Link>
                        </>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo="Gestión de Productos de Limpieza"
                descripcion="Administra los productos de limpieza y consulta sus existencias."
                acciones={usuario?.rol === 'admin' && (
                    <Link to="/productos_limpieza/nuevo">
                        <Boton variant="crear">Nuevo Producto</Boton>
                    </Link>
                )}
            />
            

            <div className={styles.filaBotonesSuperiores}>
                <BuscadorTexto valor={busqueda} onCambio={setBusqueda} placeholder="Buscar producto..." />
            </div>


            <TablaPaginada
                datos={productosFiltrados}
                columnas={misColumnas}
                gridTemplateColumns="2fr 1.5fr 1.5fr 1.5fr"
                itemsPorPagina={10}
                mensajeVacio="No hay productos registrados."
                columnaOrdenInicial="nombre"
            />
        
        </div>
    );
}