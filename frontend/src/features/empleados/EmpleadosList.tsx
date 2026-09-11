import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import type { Empleado } from '../../types/empleados';
import { getEmpleados } from '../../services/empleadosServices';
import Boton from '../../components/Boton';
import styles from '../../styles/shared.module.css';

export default function EmpleadosList() {
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    
    const [paginaActual, setPaginaActual] = useState(1);
    const empleadosPorPagina = 3; 

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

    // 1. Calculamos qué porción del array mostrar
    const indiceUltimoEmpleado = paginaActual * empleadosPorPagina;
    const indicePrimerEmpleado = indiceUltimoEmpleado - empleadosPorPagina;
    
    // 2. Recortamos la lista original
    const empleadosActuales = empleados.slice(indicePrimerEmpleado, indiceUltimoEmpleado);
    
    // 3. Calculamos el total de páginas
    const totalPaginas = Math.ceil(empleados.length / empleadosPorPagina);

    // Funciones para los botones
    const irPaginaSiguiente = () => {
        if (paginaActual < totalPaginas) setPaginaActual(paginaActual + 1);
    };

    const irPaginaAnterior = () => {
        if (paginaActual > 1) setPaginaActual(paginaActual - 1);
    };

    return (
        <div className={styles.contenedorPrincipal}>
            <h2>Lista de Empleados</h2>
            
            <Link to="/empleados/nuevo" className={styles.linkCrear}>
                <Boton variant="crear">
                    Crear Nuevo Empleado
                </Boton>
            </Link>

            <ul>
                {empleadosActuales.map((emp) => (
                    <li key={emp.id}>
                        <span>{emp.nombre} {emp.apellido}</span>
                        
                        <div className={styles.grupoBotones}>
                            <Link to={`/empleados/editar/${emp.id}`} title="Editar empleado">
                                <Boton variant="editar" />
                            </Link>
                            <Link to={`/empleados/${emp.id}`}>
                                <Boton variant="ver"></Boton>
                            </Link>
                            <Link to={`/empleados/eliminar/${emp.id}`}>
                                <Boton variant="eliminar"></Boton>
                            </Link>
                        </div>
                    </li>
                ))}
            </ul>

            {/* Solo se muestran si hay más de 1 página en total */}
            {totalPaginas > 1 && (
                <div className={styles.filaBotones} style={{ alignItems: 'center', marginTop: '20px' }}>
                    <Boton 
                        variant="volver" 
                        onClick={irPaginaAnterior} 
                        disabled={paginaActual === 1}
                    />
                    
                    <span style={{ color: 'white', fontWeight: 'bold' }}>
                        Página {paginaActual} de {totalPaginas}
                    </span>
                    
                    <Boton 
                        variant="siguiente" 
                        onClick={irPaginaSiguiente} 
                        disabled={paginaActual === totalPaginas}
                    />
                </div>
            )}
        </div>
    );
}