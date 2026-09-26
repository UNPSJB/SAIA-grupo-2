import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { Tarea } from '../../types/tareas'; 
import { getTareaById, deleteTarea } from '../../services/tareasServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function TareaDelete() {
    const [tarea, setTarea] = useState<Tarea | null>(null);
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (id) {
            getTareaById(id)
                .then(setTarea)
                .catch(err => console.error("Error al cargar:", err));
        }
    }, [id]);

    const handleDelete = async () => {
        if (!id) return;
        try {
            const exito = await deleteTarea(id);
            if (exito) {
                navigate('/tareas');
            } else {
                alert('No se pudo eliminar la tarea. Comprueba las dependencias.');
            }
        } catch (error) {
            console.error('Error de red:', error);
            alert('Error en el servidor al intentar eliminar.');
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>¿Desea eliminar esta tarea?</h2>
            {tarea ? (
                <div className={styles.tarjetaEstatica} style={{ maxWidth: '600px', width: '100%', textAlign: 'center', margin: '0 auto' }}>
                    <h3 style={{ color: 'var(--text-h)', marginBottom: '15px' }}>{tarea.titulo}</h3>
                    <p><strong>Frecuencia:</strong> {tarea.frecuencia}</p>
                    <p><strong>Planes Involucrados:</strong> {tarea.planes?.length || 0}</p>
                    
                    <div className={styles.filaBotones} style={{ marginTop: '30px' }}>
                        <Link to="/tareas">
                            <Boton variant="volver">Cancelar</Boton>
                        </Link>
                        <Boton variant="eliminar" onClick={handleDelete}>
                            Confirmar Baja
                        </Boton>
                    </div>
                </div>
            ) : (
                <p style={{ textAlign: 'center', marginTop: '40px' }}>Cargando información de la tarea...</p>
            )}
        </div>
    );
}