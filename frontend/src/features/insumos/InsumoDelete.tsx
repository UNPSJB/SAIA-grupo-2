import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { Insumo } from '../../types/insumos';
import { getInsumoById, deleteInsumo } from '../../services/insumosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function InsumoDelete() {
    const [insumo, setInsumo] = useState<Insumo | null>(null);
    const { id } = useParams();
    const navigate = useNavigate(); 

    useEffect(() => {
        const cargarInsumo = async () => {
            if (id) {
                try {
                    const data = await getInsumoById(id);
                    setInsumo(data);
                } catch (error) {
                    console.error("Error al cargar insumo:", error);
                }
            }
        };
        
        cargarInsumo();
    }, [id]);

    const handleDelete = async () => {
        if (!id) return;

        try {
            const exito = await deleteInsumo(id);
            if (exito) {
                navigate('/insumos');
            } else {
                alert('Hubo un error al intentar eliminar el registro.');
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>¿Desea eliminar este insumo?</h2>
            {insumo ? (
                <div>
                    <p>Nombre: {insumo.nombre}</p>
            
                    
                    <div className={styles.filaBotones}>
                        <Link to="/insumos">
                            <Boton variant="editar">
                                Cancelar
                            </Boton>
                        </Link>
                        <Boton variant="eliminar" onClick={handleDelete}>
                            Eliminar
                        </Boton>
                    </div>
                </div>
            ) : (
                <p>insumo no encontrado</p>
            )}
        </div>
    );
}
