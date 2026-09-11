import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Equipo } from '../../types/equipos';
import { getEquipos } from '../../services/equiposServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function EquiposList() {
    const [equipos, setEquipos] = useState<Equipo[]>([]);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getEquipos();
                setEquipos(data);
            } catch (error) {
                console.error("Error al cargar equipos:", error);
            }
        };
        
        cargarDatos();
    }, []);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Lista de Equipos</h2>
            
            <Link to="/equipos/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">
                    + Crear Nuevo Equipo
                </Boton>
            </Link>

            <ul>
                {equipos.map((eq) => (
                    <li key={eq.id}>
                        <span>{eq.nombre}</span>
                        
                        <div className={styles.grupoBotones}>
                            <Link to={`/equipos/editar/${eq.id}`}>
                                <Boton variant="editar">Editar</Boton>
                            </Link>
                            <Link to={`/equipos/${eq.id}`}>
                                <Boton variant="ver">Ver</Boton>
                            </Link>
                            <Link to={`/equipos/eliminar/${eq.id}`}>
                                <Boton variant="eliminar">Eliminar</Boton>
                            </Link>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
