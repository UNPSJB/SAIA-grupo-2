import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Capacidad } from '../../types/capacidades';
import { getCapacidades, deleteCapacidad } from '../../services/capacidadesServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function CapacidadesList() {
    const [capacidades, setCapacidades] = useState<Capacidad[]>([]);

    const cargarCapacidades = async () => {
        try {
            const data = await getCapacidades();
            setCapacidades(data);
        } catch (error) {
            console.error("Error de conexión:", error);
        }
    };

    useEffect(() => {
        cargarCapacidades();
    }, []);

    const handleEliminar = async (id: number) => {
        const confirmar = window.confirm("¿Seguro que deseas eliminar esta capacidad?");
        if (!confirmar) return;

        const exito = await deleteCapacidad(id);
        
        if (exito) {
            cargarCapacidades();
            alert("Capacidad eliminada");
        } else {
            alert("No se puede eliminar: Esta capacidad ya está asignada a uno o más empleados. Edítalos primero.");
        }
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Lista de Capacidades</h2>
            
            <Link to="/capacidades/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">
                    + Crear Nueva Capacidad
                </Boton>
            </Link>

            <ul>
                {capacidades.map((cap) => (
                    <li key={cap.id}>
                        <span>{cap.nombre}</span>
                        
                        <div className={styles.grupoBotones}>
                            <Boton 
                                variant="eliminar" 
                                onClick={() => handleEliminar(cap.id)}
                            >
                                Eliminar
                            </Boton>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
