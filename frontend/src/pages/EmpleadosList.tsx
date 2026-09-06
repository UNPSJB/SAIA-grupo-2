import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
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

export default function EmpleadosList() {
    const [empleados, setEmpleados] = useState<Persona[]>([]);

    useEffect(() => {
        fetch('http://127.0.0.1:8000/personas/')
            .then(res => res.json())
            .then(data => setEmpleados(data))
            .catch(err => console.error("Error:", err));
    }, []);

    return (
        <div>
            <h2>Lista de Empleados</h2>
            
            {/* Botón para crear nuevo */}
            <Link to="/empleados/nuevo">
                <button className={styles.btnCrear}>
                    + Crear Nuevo Empleado
                </button>
            </Link>

            <ul>
                {empleados.map((emp) => (
                    <li key={emp.id} className={styles.li}>
                        <span>{emp.nombre} ({emp.email})</span>
                        
                        {/* Botón para editar este empleado específico */}
                        <Link to={`/empleados/editar/${emp.id}`}>
                            <button className={styles.btnEditar}>
                                Editar
                            </button>
                        </Link>
                        {/* Botón para ver este empleado específico */}
                        <Link to={`/empleados/${emp.id}`}>
                            <button className={styles.btnEditar}>
                                ver
                            </button>
                        </Link>
                        {/* Botón para eliminar este empleado específico */}
                        <Link to={`/empleados/eliminar/${emp.id}`}>
                            <button className={styles.btnEliminar}>
                                Eliminar
                            </button>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}