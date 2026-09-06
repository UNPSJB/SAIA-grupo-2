import { useState, useEffect } from "react";
import { Link, useParams } from 'react-router-dom';
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

export default function EmpleadoDetail() {
    const [empleado, setEmpleado] = useState<Persona | null>(null);
    const { id } = useParams(); // Capturamos el ID de la URL

    useEffect(() => {
        // Buscamos específicamente el empleado con ese ID
        fetch(`http://127.0.0.1:8000/personas/${id}`)
            .then(res => res.json())
            .then(data => setEmpleado(data))
            .catch(err => console.error("Error:", err));
    }, [id]);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Detalle del Empleado</h2>
            {empleado ? (
                <div>
                    <p>Nombre: {empleado.nombre}</p>
                    <p>Email: {empleado.email}</p>
                    <Link to="/empleados">
                        <button className={styles.btnEditar} >Volver a la lista</button>
                    </Link>
                </div>
            ) : (
                <p>Empleado no encontrado</p>
            )}
        </div>
    );
}