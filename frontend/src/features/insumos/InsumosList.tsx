import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Insumo } from '../../types/insumos';
import { getInsumos } from '../../services/insumosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function InsumosList() {
    const [insumos, setInsumos] = useState<Insumo[]>([]);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getInsumos();
                setInsumos(data);
            } catch (error) {
                console.error("Error al cargar insumos:", error);
            }
        };
        
        cargarDatos();
    }, []);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Lista de Insumos</h2>
            
            <Link to="/insumos/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">
                    + Crear Nuevo Insumo
                </Boton>
            </Link>

            <ul>
                {insumos.map((ins) => (
                    <li key={ins.id}>
                        <span>{ins.nombre}</span>
                        <span>{ins.unidad_medida.nombre}</span>
                        <div className={styles.grupoBotones}>
                            <Link to={`/insumos/editar/${ins.id}`}>
                                <Boton variant="editar">Editar</Boton>
                            </Link>
                            <Link to={`/insumos/${ins.id}`}>
                                <Boton variant="ver">Ver</Boton>
                            </Link>
                            <Link to={`/insumos/eliminar/${ins.id}`}>
                                <Boton variant="eliminar">Eliminar</Boton>
                            </Link>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
