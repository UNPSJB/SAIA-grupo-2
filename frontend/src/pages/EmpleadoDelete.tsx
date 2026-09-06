import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import styles from './empleados.module.css';

export interface Persona {
  nombre: string;
  email: string;
  id: number;
  mascotas: {
    id: number;
    nombre: string;
    tipo: string;
    tutor_id: number;
    nombre_tutor: string;
  }[];
}

export default function EmpleadoDelete() {
    const [empleado, setEmpleado] = useState<Persona | null>(null);
    const { id } = useParams();
    const navigate = useNavigate(); 

    useEffect(() => {
        fetch(`http://127.0.0.1:8000/personas/${id}`)
            .then(res => res.json())
            .then(data => setEmpleado(data))
            .catch(err => console.error("Error:", err));
    }, [id]);

    // Función para ejecutar el borrado
    const handleDelete = async () => {
        try {
            const respuesta = await fetch(`http://127.0.0.1:8000/personas/${id}`, {
                method: 'DELETE',
            });

            if (respuesta.ok) {
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
                    <p>Email: {empleado.email}</p>
                    
                    <div className={styles.filaBotones}>
                        <button type="submit" className={styles.btnGuardar}>
                            Guardar
                        </button>
                        <Link to="/empleados">
                            {/* Asegúrate de poner type="button" para que no envíe el form por accidente */}
                            <button type="button" className={styles.btnEliminar}>
                                volver
                            </button>
                        </Link>
                    </div>
                </div>
            ) : (
                <p>Empleado no encontrado</p>
            )}
        </div>
    );
}