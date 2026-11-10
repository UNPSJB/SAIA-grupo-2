import { useNavigate, useParams } from 'react-router-dom';

import EncabezadoPagina from '../../components/EncabezadoPagina';
import FormularioProducto from './FormularioProducto';
import styles from '../../styles/shared.module.css';

export default function ProductoForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const editando = Boolean(id);

    return (
        <div className={styles.contenedorPrincipal}>
            <EncabezadoPagina
                titulo={editando ? 'Editar Producto' : 'Registrar Nuevo Producto'}
                descripcion={
                    editando
                        ? 'Modificá los datos del producto. Los lotes ya registrados no cambian.'
                        : 'Cargá un producto que elabora el establecimiento para poder registrar sus lotes de producción.'
                }
                ancho="700px"
            />

            <FormularioProducto
                key={id ?? 'nuevo'}
                productoId={id}
                onGuardado={(producto) => navigate(`/productos/${producto.id}`)}
                onCancelar={() => navigate(id ? `/productos/${id}` : '/productos')}
            />
        </div>
    );
}
