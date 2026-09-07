import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { Empleado } from '../../types/empleados';
import { getEmpleadoById, deleteEmpleado } from '../../services/empleadosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function EmpleadoDelete() {
    const [empleado, setEmpleado] = useState<Empleado | null>(null);
    const { id } = useParams();
    const navigate = useNavigate(); 

    useEffect(() => {
        const cargarEmpleado = async () => {
            if (id) {
                try {
                    const data = await getEmpleadoById(id);
                    setEmpleado(data);
                } catch (error) {
                    console.error("Error al cargar empleado:", error);
                }
            }
        };
        
        cargarEmpleado();
    }, [id]);

    const handleDelete = async () => {
        if (!id) return;

        try {
            const exito = await deleteEmpleado(id);
            if (exito) {
                navigate('/empleados');
            } else {
                alert('Hubo un error al intentar eliminar el registro.');
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>¿Desea eliminar este empleado?</h2>
            {empleado ? (
                <div>
                    <p>Nombre: {empleado.nombre}</p>
                    <p>Apellido: {empleado.apellido}</p>
                    
                    <div className={styles.filaBotones}>
                        <Link to="/empleados">
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
                <p>Empleado no encontrado</p>
            )}
        </div>
    );
}
