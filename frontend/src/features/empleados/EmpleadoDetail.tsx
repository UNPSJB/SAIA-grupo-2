import { useState, useEffect } from "react";
import { Link, useParams } from 'react-router-dom';
import type { Empleado } from '../../types/empleados';
import { getEmpleadoById } from '../../services/empleadosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function EmpleadoDetail() {
    const [empleado, setEmpleado] = useState<Empleado | null>(null);
    const { id } = useParams();

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

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Detalle del Empleado</h2>
            {empleado ? (
                <div>
                    <p>Nombre: {empleado.nombre}</p>
                    <p>Apellido: {empleado.apellido}</p>
                    
                    <p>
                        Capacidades: {empleado.capacidades && empleado.capacidades.length > 0 
                            ? empleado.capacidades.map(c => c.nombre).join(', ') 
                            : 'Ninguna asignada'}
                    </p>

                    <div className={styles.bloqueDetalle}>
                        <Link to="/empleados">
                            <Boton variant="editar">Volver a la lista</Boton>
                        </Link>
                    </div>
                </div>
            ) : (
                <p>Empleado no encontrado</p>
            )}
        </div>
    );
}
