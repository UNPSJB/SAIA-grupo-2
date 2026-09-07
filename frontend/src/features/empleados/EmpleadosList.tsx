import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Empleado } from '../../types/empleados';
import { getEmpleados } from '../../services/empleadosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function EmpleadosList() {
    const [empleados, setEmpleados] = useState<Empleado[]>([]);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getEmpleados();
                setEmpleados(data);
            } catch (error) {
                console.error("Error al cargar empleados:", error);
            }
        };
        
        cargarDatos();
    }, []);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Lista de Empleados</h2>
            
            <Link to="/empleados/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">
                    + Crear Nuevo Empleado
                </Boton>
            </Link>

            <ul>
                {empleados.map((emp) => (
                    <li key={emp.id}>
                        <span>{emp.nombre} {emp.apellido}</span>
                        
                        <div className={styles.grupoBotones}>
                            <Link to={`/empleados/editar/${emp.id}`}>
                                <Boton variant="editar">Editar</Boton>
                            </Link>
                            <Link to={`/empleados/${emp.id}`}>
                                <Boton variant="editar">Ver</Boton>
                            </Link>
                            <Link to={`/empleados/eliminar/${emp.id}`}>
                                <Boton variant="eliminar">Eliminar</Boton>
                            </Link>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
