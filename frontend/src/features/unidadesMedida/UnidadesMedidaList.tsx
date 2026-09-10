import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { UnidadMedida } from '../../types/unidadesMedida';
import { getUnidadesMedida } from '../../services/unidadesMedidaServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function UnidadesMedidaList() {
    const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedida[]>([]);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const data = await getUnidadesMedida();
                setUnidadesMedida(data);
            } catch (error) {
                console.error("Error al cargar unidades medida:", error);
            }
        };
        
        cargarDatos();
    }, []);

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Lista de unidades de medida</h2>
            
            {/* <Link to="/unidadesmedida/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">
                    + Crear Nueva unidad
                </Boton>
            </Link> */}

            <ul>
                {unidadesMedida.map((unidad) => (
                    <li key={unidad.id}>
                        <span>{unidad.nombre}</span>
                        
                        <div className={styles.grupoBotones}>
                            {/* <Link to={`/insumos/editar/${unidad.id}`}>
                                <Boton variant="editar">Editar</Boton>
                            </Link>
                            <Link to={`/insumos/${unidad.id}`}>
                                <Boton variant="editar">Ver</Boton>
                            </Link>
                            <Link to={`/insumos/eliminar/${unidad.id}`}>
                                <Boton variant="eliminar">Eliminar</Boton>
                            </Link> */}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
